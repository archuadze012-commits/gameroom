import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { game?: string; rank?: string; description?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const game = (body.game ?? "").trim();
  const rank = (body.rank ?? "").trim();
  const description = (body.description ?? "").trim().slice(0, 300);

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

