import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`lfg-assist:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  let body: { prompt?: string; game?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "empty" }, { status: 400 });

  const game = body.game ? `áƒ—áƒáƒ›áƒáƒ¨áƒ˜: ${body.game}` : "";

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
              "áƒ¨áƒ”áƒœ áƒ®áƒáƒ  áƒáƒ¡áƒ˜áƒ¡áƒ¢áƒ”áƒœáƒ¢áƒ˜ Georgian gaming community áƒ¡áƒáƒ˜áƒ¢áƒ–áƒ” (gameroom.com.ge). " +
              "áƒ›áƒáƒ›áƒ®áƒ›áƒáƒ áƒ”áƒ‘áƒ”áƒšáƒ˜ áƒ”áƒ«áƒ”áƒ‘áƒ¡ teammate-áƒ”áƒ‘áƒ¡. áƒ›áƒ˜áƒ¡áƒ˜ áƒ›áƒáƒ™áƒšáƒ” áƒáƒ¦áƒ¬áƒ”áƒ áƒ˜áƒ¡ áƒ›áƒ˜áƒ®áƒ”áƒ“áƒ•áƒ˜áƒ— áƒ’áƒ”áƒœáƒ”áƒ áƒ˜áƒ áƒ”: " +
              "áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜ (áƒ›áƒáƒ¥áƒ¡ 60 áƒ¡áƒ˜áƒ›áƒ‘áƒáƒšáƒ, áƒ›áƒ˜áƒ›áƒ–áƒ˜áƒ“áƒ•áƒ”áƒšáƒ˜) áƒ“áƒ áƒáƒ¦áƒ¬áƒ”áƒ áƒ (2-3 áƒ¬áƒ˜áƒœáƒáƒ“áƒáƒ“áƒ”áƒ‘áƒ áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒáƒ“). " +
              'áƒ›áƒ®áƒáƒšáƒáƒ“ JSON áƒ“áƒáƒáƒ‘áƒ áƒ£áƒœáƒ”: {"title": "...", "description": "..."}',
          },
          { role: "user", content: `${game}\n${prompt}` },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("[/api/lfg-assist] OpenAI error:", JSON.stringify(json));
      return NextResponse.json({ error: "openai_error", detail: json?.error?.message }, { status: 500 });
    }

    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`no json in: ${text.slice(0, 200)}`);
    const parsed = JSON.parse(match[0]);
    if (!parsed.title || !parsed.description) throw new Error("bad format");
    return NextResponse.json({ title: parsed.title, description: parsed.description });
  } catch (e) {
    console.error("[/api/lfg-assist]", e);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

