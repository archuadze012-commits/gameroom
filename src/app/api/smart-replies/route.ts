import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:smart-replies", 30, 60_000);
  if (!guard.ok) return guard.response;

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ replies: [] });

  const body = await readJsonObject<{ lastMessage?: string }>(request, 4 * 1024);
  if (!body.ok) return NextResponse.json({ replies: [] });

  const lastMessage = (body.data.lastMessage ?? "").trim().slice(0, 500);
  if (!lastMessage) return NextResponse.json({ replies: [] });

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
              "áƒ¨áƒ”áƒœ áƒ®áƒáƒ  áƒáƒ¡áƒ˜áƒ¡áƒ¢áƒ”áƒœáƒ¢áƒ˜ Georgian gaming community chat-áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡. " +
              "áƒ›áƒáƒ›áƒ®áƒ›áƒáƒ áƒ”áƒ‘áƒšáƒ˜áƒ¡ áƒ‘áƒáƒšáƒ áƒ¨áƒ”áƒ¢áƒ§áƒáƒ‘áƒ˜áƒœáƒ”áƒ‘áƒ˜áƒ¡ áƒ›áƒ˜áƒ®áƒ”áƒ“áƒ•áƒ˜áƒ— áƒ¨áƒ”áƒ›áƒáƒ’áƒ•áƒ—áƒáƒ•áƒáƒ–áƒ” 3 áƒ›áƒáƒ™áƒšáƒ”, áƒ‘áƒ£áƒœáƒ”áƒ‘áƒ áƒ˜áƒ•áƒ˜ áƒžáƒáƒ¡áƒ£áƒ®áƒ˜ áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒáƒ“. " +
              "áƒžáƒáƒ¡áƒ£áƒ®áƒ”áƒ‘áƒ˜ áƒ£áƒœáƒ“áƒ áƒ˜áƒ§áƒáƒ¡ 2-6 áƒ¡áƒ˜áƒ¢áƒ§áƒ•áƒ, gaming áƒ™áƒáƒœáƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ¨áƒ˜ áƒ¨áƒ”áƒ¡áƒáƒ‘áƒáƒ›áƒ˜áƒ¡áƒ˜. " +
              'áƒ›áƒ®áƒáƒšáƒáƒ“ JSON áƒ“áƒáƒáƒ‘áƒ áƒ£áƒœáƒ”: {"replies": ["áƒžáƒáƒ¡áƒ£áƒ®áƒ˜ 1", "áƒžáƒáƒ¡áƒ£áƒ®áƒ˜ 2", "áƒžáƒáƒ¡áƒ£áƒ®áƒ˜ 3"]}',
          },
          { role: "user", content: lastMessage },
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"replies":[]}');
    return NextResponse.json({ replies: (parsed.replies ?? []).slice(0, 3) });
  } catch (e) {
    console.error("[/api/smart-replies]", e);
    return NextResponse.json({ replies: [] });
  }
}

