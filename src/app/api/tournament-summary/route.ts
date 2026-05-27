import { NextRequest, NextResponse } from "next/server";

type MatchResult = { player1: string; player2: string; score1: number; score2: number; winner: string };

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { tournamentName?: string; game?: string; matches?: MatchResult[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const { tournamentName, game, matches } = body;
  if (!matches?.length) return NextResponse.json({ error: "no_matches" }, { status: 400 });

  const completed = matches.filter((m) => m.winner);
  const matchText = completed
    .map((m) => `${m.player1} vs ${m.player2}: ${m.score1}-${m.score2} â†’ ${m.winner}`)
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
              "áƒ¨áƒ”áƒœ áƒ®áƒáƒ  áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒ˜ gaming áƒŸáƒ£áƒ áƒœáƒáƒšáƒ˜áƒ¡áƒ¢áƒ˜. " +
              "áƒ¢áƒ£áƒ áƒœáƒáƒ›áƒ”áƒœáƒ¢áƒ˜áƒ¡ áƒ¨áƒ”áƒ“áƒ”áƒ’áƒ”áƒ‘áƒ˜áƒ¡ áƒ›áƒ˜áƒ®áƒ”áƒ“áƒ•áƒ˜áƒ— áƒ“áƒáƒ¬áƒ”áƒ áƒ” áƒ”áƒ›áƒáƒªáƒ˜áƒ£áƒ áƒ˜, áƒ›áƒ˜áƒ›áƒ–áƒ˜áƒ“áƒ•áƒ”áƒšáƒ˜ áƒ áƒ”áƒ–áƒ˜áƒ£áƒ›áƒ” áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒáƒ“ (3-4 áƒ¬áƒ˜áƒœáƒáƒ“áƒáƒ“áƒ”áƒ‘áƒ). " +
              "áƒ’áƒáƒ›áƒáƒ§áƒáƒ•áƒ˜ áƒ’áƒáƒ›áƒáƒ áƒ¯áƒ•áƒ”áƒ‘áƒ£áƒšáƒ˜, áƒ¡áƒáƒ£áƒ™áƒ”áƒ—áƒ”áƒ¡áƒ áƒ›áƒáƒ¢áƒ©áƒ˜, áƒ¨áƒ—áƒáƒ›áƒ‘áƒ”áƒ­áƒ“áƒáƒ•áƒ˜ áƒ›áƒáƒ›áƒ”áƒœáƒ¢áƒ”áƒ‘áƒ˜. " +
              "áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ˜ áƒ“áƒáƒáƒ‘áƒ áƒ£áƒœáƒ”.",
          },
          {
            role: "user",
            content: `áƒ¢áƒ£áƒ áƒœáƒáƒ›áƒ”áƒœáƒ¢áƒ˜: ${tournamentName ?? "áƒ£áƒªáƒœáƒáƒ‘áƒ˜"}\náƒ—áƒáƒ›áƒáƒ¨áƒ˜: ${game ?? "áƒ£áƒªáƒœáƒáƒ‘áƒ˜"}\n\náƒ¨áƒ”áƒ“áƒ”áƒ’áƒ”áƒ‘áƒ˜:\n${matchText}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    const json = await res.json();
    const summary: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) throw new Error("empty");
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[/api/tournament-summary]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

