import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { text?: string; targetLang?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const text = (body.text ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const target = body.targetLang ?? "áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒ˜";

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
            content: `áƒ—áƒáƒ áƒ’áƒ›áƒœáƒ” áƒ¨áƒ”áƒ›áƒ“áƒ”áƒ’áƒ˜ áƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ˜ ${target} áƒ”áƒœáƒáƒ–áƒ”. áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ—áƒáƒ áƒ’áƒ›áƒáƒœáƒ˜ áƒ“áƒáƒáƒ‘áƒ áƒ£áƒœáƒ”, áƒ¡áƒ®áƒ•áƒ áƒáƒ áƒáƒ¤áƒ”áƒ áƒ˜.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    const json = await res.json();
    const translated: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!translated) throw new Error("empty");
    return NextResponse.json({ translated });
  } catch (e) {
    console.error("[/api/translate]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

