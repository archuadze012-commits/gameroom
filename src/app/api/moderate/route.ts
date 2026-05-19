import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 30-second in-memory cache for the blocklist
let cachedWords: string[] = [];
let cacheExpiry = 0;

async function getBlocklist(): Promise<string[]> {
  if (Date.now() < cacheExpiry) return cachedWords;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await supabase.from("blocked_words").select("word");
    cachedWords = (data ?? []).map((r: { word: string }) => r.word);
    cacheExpiry = Date.now() + 30_000;
  } catch {
    // keep existing cache on error
  }
  return cachedWords;
}

async function groq(messages: { role: string; content: string }[]) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 20,
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

  // Check against DB blocklist first (fast, no AI needed)
  const blocklist = await getBlocklist();
  if (blocklist.some((w) => message.includes(w))) {
    return NextResponse.json({ toxic: true });
  }

  // AI check for English and complex cases
  try {
    const text = await groq([
      {
        role: "system",
        content:
          "You are a content moderator for a Georgian gaming community chat. " +
          "Determine if the message contains toxic content: hate speech, slurs, harassment, explicit threats, or severe profanity in any language. " +
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
