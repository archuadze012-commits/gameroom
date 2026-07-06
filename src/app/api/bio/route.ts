import { NextRequest, NextResponse } from "next/server";
import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:bio");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:bio", 10, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:bio");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ role?: string; games?: string[]; voiceChat?: boolean }>(request, 8 * 1024);
  if (!body.ok) return body.response;

  const games =
    (Array.isArray(body.data.games) ? body.data.games : [])
      .filter((game): game is string => typeof game === "string")
      .slice(0, 10)
      .map((game) => game.slice(0, 80))
      .join(", ") || "სხვადასხვა";
  const voice = body.data.voiceChat ? "voice chat-ით" : "voice chat-ის გარეშე";

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
              "შენ ხელოვნური ინტელექტი ხარ, რომელიც Georgian gaming community-სთვის პროფილის bio-ებს წერ. " +
              "დაწერე მოკლე, ბუნებრივი bio (2-3 წინადადება) ქართულად, პირველი პირიდან. " +
              "Bio-ი უნდა ჟღერდეს პერსონალურად და ავტენტურად, არა რობოტულად. " +
              "მხოლოდ bio ტექსტი დააბრუნე, ბრჭყალების ან დამატებითი ფორმატირების გარეშე.",
          },
          {
            role: "user",
            content: `საყვარელი თამაშები: ${games}\nთამაშის სტილი: ${voice}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    const bio: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!bio) throw new Error("empty response");
    return NextResponse.json({ bio });
  } catch (e) {
    logger.error("bio generation failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

