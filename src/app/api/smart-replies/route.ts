import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:smart-replies");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:smart-replies", 30, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = getServerEnv("GROQ_API_KEY");
  if (!groqKey) return NextResponse.json({ replies: [] });

  const body = await readJsonObject<{ lastMessage?: string }>(request, 4 * 1024);
  if (!body.ok) return NextResponse.json({ replies: [] });

  const lastMessage = (body.data.lastMessage ?? "").trim().slice(0, 500);
  if (!lastMessage) return NextResponse.json({ replies: [] });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "შენ ხარ ასისტენტი Georgian gaming community chat-ისთვის. " +
              "მომხმარებლის ბოლო შეტყობინების მიხედვით შემოგვთავაზე 3 მოკლე, ბუნებრივი პასუხი ქართულად. " +
              "პასუხები უნდა იყოს 2-6 სიტყვა, gaming კონტექსტში შესაბამისი. " +
              'მხოლოდ JSON დააბრუნე: {"replies": ["პასუხი 1", "პასუხი 2", "პასუხი 3"]}',
          },
          { role: "user", content: lastMessage },
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"replies":[]}');
    return NextResponse.json({ replies: (parsed.replies ?? []).slice(0, 3) });
  } catch (e) {
    logger.warn("smart replies failed", { error: e });
    return NextResponse.json({ replies: [] });
  }
}

