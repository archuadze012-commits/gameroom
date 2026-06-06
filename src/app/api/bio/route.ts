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
      .join(", ") || "áƒ¡áƒ®áƒ•áƒáƒ“áƒáƒ¡áƒ®áƒ•áƒ";
  const voice = body.data.voiceChat ? "voice chat-áƒ˜áƒ—" : "voice chat-áƒ˜áƒ¡ áƒ’áƒáƒ áƒ”áƒ¨áƒ”";

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
              "áƒ¨áƒ”áƒœ áƒ®áƒ”áƒšáƒáƒ•áƒœáƒ£áƒ áƒ˜ áƒ˜áƒœáƒ¢áƒ”áƒšáƒ”áƒ¥áƒ¢áƒ˜ áƒ®áƒáƒ , áƒ áƒáƒ›áƒ”áƒšáƒ˜áƒª Georgian gaming community-áƒ¡áƒ—áƒ•áƒ˜áƒ¡ áƒžáƒ áƒáƒ¤áƒ˜áƒšáƒ˜áƒ¡ bio-áƒ”áƒ‘áƒ¡ áƒ¬áƒ”áƒ . " +
              "áƒ“áƒáƒ¬áƒ”áƒ áƒ” áƒ›áƒáƒ™áƒšáƒ”, áƒ‘áƒ£áƒœáƒ”áƒ‘áƒ áƒ˜áƒ•áƒ˜ bio (2-3 áƒ¬áƒ˜áƒœáƒáƒ“áƒáƒ“áƒ”áƒ‘áƒ) áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒáƒ“, áƒžáƒ˜áƒ áƒ•áƒ”áƒšáƒ˜ áƒžáƒ˜áƒ áƒ˜áƒ“áƒáƒœ. " +
              "Bio-áƒ˜ áƒ£áƒœáƒ“áƒ áƒŸáƒ¦áƒ”áƒ áƒ“áƒ”áƒ¡ áƒžáƒ”áƒ áƒ¡áƒáƒœáƒáƒšáƒ£áƒ áƒáƒ“ áƒ“áƒ áƒáƒ•áƒ¢áƒ”áƒœáƒ¢áƒ£áƒ áƒáƒ“, áƒáƒ áƒ áƒ áƒáƒ‘áƒáƒ¢áƒ£áƒšáƒáƒ“. " +
              "áƒ›áƒ®áƒáƒšáƒáƒ“ bio áƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ˜ áƒ“áƒáƒáƒ‘áƒ áƒ£áƒœáƒ”, áƒ‘áƒ áƒ­áƒ§áƒáƒšáƒ”áƒ‘áƒ˜áƒ¡ áƒáƒœ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ˜áƒ—áƒ˜ áƒ¤áƒáƒ áƒ›áƒáƒ¢áƒ˜áƒ áƒ”áƒ‘áƒ˜áƒ¡ áƒ’áƒáƒ áƒ”áƒ¨áƒ”.",
          },
          {
            role: "user",
            content: `áƒ¡áƒáƒ§áƒ•áƒáƒ áƒ”áƒšáƒ˜ áƒ—áƒáƒ›áƒáƒ¨áƒ”áƒ‘áƒ˜: ${games}\náƒ—áƒáƒ›áƒáƒ¨áƒ˜áƒ¡ áƒ¡áƒ¢áƒ˜áƒšáƒ˜: ${voice}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
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

