import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:translate", 30, 60_000);
  if (!guard.ok) return guard.response;

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ text?: string; targetLang?: string }>(request, 8 * 1024);
  if (!body.ok) return body.response;

  const text = (body.data.text ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const target = (body.data.targetLang ?? "áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒ˜").slice(0, 32);

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

