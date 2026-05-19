import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ toxic: false });

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ toxic: false });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ toxic: false });

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
              "You are a content moderator for a Georgian gaming community chat. " +
              "Messages may be in Georgian, English, or Russian. " +
              "Determine if the message contains toxic content: hate speech, slurs (including Georgian ones like ბოზი, პიდარი, ლაჰო, მეძავი, დედამოთი), harassment, explicit threats, or severe profanity in any language. " +
              "Normal gaming language, mild frustration, and competitive banter are acceptable. " +
              'Respond ONLY with valid JSON: {"toxic": true} or {"toxic": false}',
          },
          { role: "user", content: message },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ toxic: !!parsed.toxic });
  } catch (e) {
    console.error("[/api/moderate]", e);
    return NextResponse.json({ toxic: false });
  }
}
