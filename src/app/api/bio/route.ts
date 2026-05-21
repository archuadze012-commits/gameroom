import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { role?: string; games?: string[]; voiceChat?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const games = (body.games ?? []).join(", ") || "áƒ¡áƒ®áƒ•áƒáƒ“áƒáƒ¡áƒ®áƒ•áƒ";
  const voice = body.voiceChat ? "voice chat-áƒ˜áƒ—" : "voice chat-áƒ˜áƒ¡ áƒ’áƒáƒ áƒ”áƒ¨áƒ”";

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
    console.error("[/api/bio]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

