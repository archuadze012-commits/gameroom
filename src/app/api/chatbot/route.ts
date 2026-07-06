import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

type ChatMessage = { role?: unknown; content?: unknown };
const logger = createLogger("api:chatbot");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:chatbot", 20, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:chatbot");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ messages?: ChatMessage[] }>(request, 24 * 1024);
  if (!body.ok) return body.response;

  const history = (body.data.messages ?? [])
    .filter(
      (message): message is { role: "user" | "assistant"; content: string } =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1000),
    }));

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey.value}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "შენ ხარ Gameroom-ის ასისტენტი — ქართული gaming community საიტი (gameroom.com.ge). " +
              "ეხმარები მომხმარებლებს LFG-ის შექმნაში, თამაშების პოვნაში, match-ის მოძიებაში და სხვა კითხვებზე. " +
              "პასუხობ ქართულად, მოკლედ და მეგობრულად. " +
              "საიტის ძირითადი სექციები: /lfg (teammate-ების პოვნა), /games (თამაშების კატალოგი), /free-pc-games (უფასო PC თამაშები), /tournaments (ჩემპიონატები), /messages (DM-ები). " +
              "თუ კითხვა gaming-თან ან საიტთან არ არის დაკავშირებული, ზრდილობიანად გადაამისამართე.",
          },
          ...history,
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("empty");
    return NextResponse.json({ reply });
  } catch (e) {
    logger.error("chatbot generation failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

