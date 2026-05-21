import { NextRequest, NextResponse } from "next/server";

type Participant = { name: string; rank?: string; winRate?: number };

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { participants?: Participant[]; format?: string; game?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const { participants, format = "Single Elimination", game } = body;
  if (!participants?.length || participants.length < 2) {
    return NextResponse.json({ error: "not_enough_participants" }, { status: 400 });
  }

  const participantText = participants
    .map((p, i) => `${i + 1}. ${p.name}${p.rank ? ` (${p.rank})` : ""}${p.winRate !== undefined ? ` win-rate: ${p.winRate}%` : ""}`)
    .join("\n");

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
              `You are a tournament bracket seeding expert for ${format} format. ` +
              "Based on participant ranks and stats, assign seeds (1=strongest) to create a balanced bracket. " +
              "Ensure top seeds don't face each other early. " +
              'Return JSON: {"seedings": [{"name": "...", "seed": 1, "reason": "short reason in Georgian"}]}',
          },
          {
            role: "user",
            content: `áƒ—áƒáƒ›áƒáƒ¨áƒ˜: ${game ?? "Gaming"}\náƒ¤áƒáƒ áƒ›áƒáƒ¢áƒ˜: ${format}\n\náƒ›áƒáƒœáƒáƒ¬áƒ˜áƒšáƒ”áƒ”áƒ‘áƒ˜:\n${participantText}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.4,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"seedings":[]}');
    return NextResponse.json({ seedings: parsed.seedings ?? [] });
  } catch (e) {
    console.error("[/api/bracket-generate]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

