import { NextRequest, NextResponse } from "next/server";

async function groq(messages: { role: string; content: string }[], maxTokens = 20) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "") as string;
}

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ toxic: false });

  let body: { message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ toxic: false }); }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ toxic: false });

  try {
    const text = await groq([
      {
        role: "system",
        content:
          "You are a content moderator for a Georgian gaming community chat. " +
          "Messages may be in Georgian (ქართული), English, or Russian. " +
          "Determine if the message contains toxic content: hate speech, slurs (Georgian: ბოზი, პიდარი, ლაჰო, მეძავი, დედამოთი, ძაღლო), harassment, explicit threats, or severe profanity in any language. " +
          "Normal gaming language and competitive banter are acceptable. " +
          'Respond ONLY with JSON: {"toxic": true} or {"toxic": false}',
      },
      { role: "user", content: message },
    ]);
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ toxic: !!parsed.toxic });
  } catch (e) {
    console.error("[/api/moderate]", e);
    return NextResponse.json({ toxic: false });
  }
}
