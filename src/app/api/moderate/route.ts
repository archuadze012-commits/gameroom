import { NextRequest, NextResponse } from "next/server";

const GEO_BLOCKLIST = [
  "პიდარ", "პედარ", "პიდრ", "ლაჰო", "ბოზ", "მეძავ",
  "დედამოთ", "დედაშენ", "დედაც", "შენი დედა",
  "ნამუსი", "ძაღლო", "სულელო", "იდიოტო",
];

function hasGeorgianProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return GEO_BLOCKLIST.some((w) => lower.includes(w));
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ toxic: false });

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ toxic: false });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ toxic: false });

  // Fast keyword check for Georgian profanity before hitting AI
  if (hasGeorgianProfanity(message)) return NextResponse.json({ toxic: true });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a content moderator for a gaming community chat. Messages may be in Georgian, English, or other languages. " +
              "Determine if the message contains toxic content: hate speech, slurs, harassment, explicit threats, or severe profanity in ANY language. " +
              "Georgian profanity examples (always toxic): პიდარასი, პიდარი, დედაშენი, დედამოთი, ძაღლი (as insult), პ*ტო, ბოზი, ლაჰო, ნამუსი (as slur). " +
              "Normal gaming language, mild frustration, and competitive banter are acceptable. " +
              'Respond ONLY with valid JSON, nothing else: {"toxic": true} or {"toxic": false}',
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
