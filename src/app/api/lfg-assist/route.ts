import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { prompt?: string; game?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "empty" }, { status: 400 });

  const game = body.game ? `თამაში: ${body.game}` : "";

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "შენ ხარ ასისტენტი Georgian gaming community საიტზე (gameroom.com.ge). " +
              "მომხმარებელი ეძებს teammate-ებს. მისი მოკლე აღწერის მიხედვით გენერირე: " +
              "- სათაური (მაქს 60 სიმბოლო, მიმზიდველი) " +
              "- აღწერა (2-3 წინადადება ქართულად, პირველი პირიდან) " +
              'მხოლოდ JSON დააბრუნე: {"title": "...", "description": "..."}',
          },
          {
            role: "user",
            content: `${game}\n${prompt}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!parsed.title || !parsed.description) throw new Error("bad format");
    return NextResponse.json({ title: parsed.title, description: parsed.description });
  } catch (e) {
    console.error("[/api/lfg-assist]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}
