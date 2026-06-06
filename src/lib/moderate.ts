import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

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

export async function moderateText(
  content: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!content.trim()) return { ok: true };
  const groqKey = getServerEnv("GROQ_API_KEY");
  if (!groqKey) return { ok: true };

  const blocklist = await getBlocklist();
  if (blocklist.some((w) => content.toLowerCase().includes(w.toLowerCase()))) {
    return { ok: false, reason: "დაბლოკილი სიტყვა" };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a content moderator for a Georgian gaming community. " +
              "Check if the text contains: hate speech, slurs, harassment, spam, scam links, explicit threats, or adult content in any language. " +
              "Normal gaming language and competitive banter are acceptable. " +
              'Respond ONLY with JSON: {"toxic": false} or {"toxic": true, "reason": "short reason in Georgian"}',
          },
          { role: "user", content },
        ],
        max_tokens: 30,
        temperature: 0,
      }),
    });
    const json = await res.json();
    const text = (json.choices?.[0]?.message?.content ?? "") as string;
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"toxic":false}');
    return { ok: !parsed.toxic, reason: parsed.reason };
  } catch {
    return { ok: true };
  }
}
