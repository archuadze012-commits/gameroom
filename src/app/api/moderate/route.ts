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

async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 30) {
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
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ toxic: false, ok: true });

  let body: { message?: string; text?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ toxic: false, ok: true }); }

  const content = ((body.message ?? body.text ?? "")).trim();
  if (!content) return NextResponse.json({ toxic: false, ok: true });

  // Check against DB blocklist first (fast, no AI needed)
  const blocklist = await getBlocklist();
  if (blocklist.some((w) => content.toLowerCase().includes(w.toLowerCase()))) {
    return NextResponse.json({ toxic: true, ok: false, reason: "áƒ“áƒáƒ‘áƒšáƒáƒ™áƒ˜áƒšáƒ˜ áƒ¡áƒ˜áƒ¢áƒ§áƒ•áƒ" });
  }

  // AI check
  try {
    const text = await callOpenAI([
      {
        role: "system",
        content:
          "You are a content moderator for a Georgian gaming community. " +
          "Check if the text contains: hate speech, slurs, harassment, spam, scam links, explicit threats, or adult content in any language. " +
          "Normal gaming language and competitive banter are acceptable. " +
          'Respond ONLY with JSON: {"toxic": false} or {"toxic": true, "reason": "short reason in Georgian"}',
      },
      { role: "user", content },
    ]);
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"toxic":false}');
    return NextResponse.json({ toxic: !!parsed.toxic, ok: !parsed.toxic, reason: parsed.reason });
  } catch (e) {
    console.error("[/api/moderate]", e);
    return NextResponse.json({ toxic: false, ok: true });
  }
}

