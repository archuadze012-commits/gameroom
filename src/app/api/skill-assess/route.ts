import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:skill-assess", 10, 60_000);
  if (!guard.ok) return guard.response;

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ game?: string; rank?: string; description?: string }>(request, 8 * 1024);
  if (!body.ok) return body.response;

  const game = (body.data.game ?? "").trim().slice(0, 80);
  const rank = (body.data.rank ?? "").trim().slice(0, 80);
  const description = (body.data.description ?? "").trim().slice(0, 300);

  if (!game) return NextResponse.json({ error: "game_required" }, { status: 400 });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "áƒ¨áƒ”áƒœ áƒ®áƒáƒ  gaming skill assessor. áƒ›áƒáƒ—áƒáƒ›áƒáƒ¨áƒ˜áƒ¡ áƒ›áƒ˜áƒ¬áƒáƒ“áƒ”áƒ‘áƒ£áƒšáƒ˜ áƒ˜áƒœáƒ¤áƒáƒ áƒ›áƒáƒªáƒ˜áƒ˜áƒ¡ áƒ›áƒ˜áƒ®áƒ”áƒ“áƒ•áƒ˜áƒ—: " +
              "1) áƒ›áƒ˜áƒ”áƒªáƒ˜ tier áƒ¡áƒáƒ®áƒ”áƒšáƒ˜ (Bronze/Silver/Gold/Platinum/Diamond/Master/Grandmaster) " +
              "2) áƒ›áƒáƒ™áƒšáƒ” áƒáƒœáƒáƒšáƒ˜áƒ–áƒ˜ áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒáƒ“ (2 áƒ¬áƒ˜áƒœáƒáƒ“áƒáƒ“áƒ”áƒ‘áƒ) " +
              "3) 2 áƒ™áƒáƒœáƒ™áƒ áƒ”áƒ¢áƒ£áƒšáƒ˜ áƒ áƒ©áƒ”áƒ•áƒ áƒ’áƒáƒ£áƒ›áƒ¯áƒáƒ‘áƒ”áƒ¡áƒ”áƒ‘áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡ " +
              'JSON-áƒáƒ“: {"tier": "...", "analysis": "...", "tips": ["...", "..."]}',
          },
          {
            role: "user",
            content: `áƒ—áƒáƒ›áƒáƒ¨áƒ˜: ${game}${rank ? `\náƒ áƒáƒœáƒ™áƒ˜/áƒ“áƒáƒœáƒ”: ${rank}` : ""}${description ? `\náƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ˜áƒ—áƒ˜: ${description}` : ""}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.6,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? "{}");
    if (!parsed.tier) throw new Error("bad format");
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[/api/skill-assess]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

