import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";

type LfgPost = { id: string; title: string; description: string | null; rank: string | null };

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:lfg-suggest-mates", 10, 60_000);
  if (!guard.ok) return guard.response;

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ suggestions: [] });

  const body = await readJsonObject<{ postId?: string; gameSlug?: string; title?: string; description?: string }>(
    request,
    8 * 1024,
  );
  if (!body.ok) return NextResponse.json({ suggestions: [] });

  const { postId, gameSlug, title, description } = body.data;
  if (!postId || !gameSlug) return NextResponse.json({ suggestions: [] });

  // fetch other recent LFG posts for the same game
  const supabase = await createSupabaseServerClient();
  const { data: others } = await supabase
    .from("lfg_posts")
    .select("id, title, description, rank")
    .eq("game_slug", gameSlug)
    .neq("id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!others?.length) return NextResponse.json({ suggestions: [] });

  const candidatesText = (others as LfgPost[])
    .map((p, i) => `[${i + 1}] ID:${p.id} | "${p.title}"${p.rank ? ` | áƒ áƒáƒœáƒ™áƒ˜: ${p.rank}` : ""}${p.description ? ` | ${p.description.slice(0, 80)}` : ""}`)
    .join("\n");

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
              "áƒ¨áƒ”áƒœ áƒ®áƒáƒ  gaming teammate matching áƒ¡áƒ˜áƒ¡áƒ¢áƒ”áƒ›áƒ. " +
              "áƒ¨áƒ”áƒáƒ“áƒáƒ áƒ” áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ LFG áƒžáƒáƒ¡áƒ¢áƒ˜ áƒ™áƒáƒœáƒ“áƒ˜áƒ“áƒáƒ¢áƒ”áƒ‘áƒ¡ áƒ“áƒ áƒ¨áƒ”áƒáƒ áƒ©áƒ˜áƒ” 3 áƒ§áƒ•áƒ”áƒšáƒáƒ–áƒ” áƒ¨áƒ”áƒ—áƒáƒ•áƒ¡áƒ”áƒ‘áƒáƒ“áƒ˜. " +
              "áƒ’áƒáƒ›áƒáƒ˜áƒ§áƒ”áƒœáƒ”: áƒ áƒáƒœáƒ™áƒ˜, áƒ¡áƒ¢áƒ˜áƒšáƒ˜, áƒ›áƒáƒ—áƒ®áƒáƒ•áƒœáƒ”áƒ‘áƒ˜. " +
              'áƒ“áƒáƒáƒ‘áƒ áƒ£áƒœáƒ” JSON: {"suggestions": [{"id": "...", "reason": "áƒ›áƒáƒ™áƒšáƒ” áƒ›áƒ˜áƒ–áƒ”áƒ–áƒ˜ áƒ¥áƒáƒ áƒ—áƒ£áƒšáƒáƒ“"}]}',
          },
          {
            role: "user",
            content: `áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜: "${title}"${description ? ` â€” ${description.slice(0, 150)}` : ""}\n\náƒ™áƒáƒœáƒ“áƒ˜áƒ“áƒáƒ¢áƒ”áƒ‘áƒ˜:\n${candidatesText}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"suggestions":[]}');

    // enrich with post data
    const enriched = (parsed.suggestions ?? []).slice(0, 3).map((s: { id: string; reason: string }) => {
      const post = (others as LfgPost[]).find((p) => p.id === s.id);
      return post ? { ...s, title: post.title, rank: post.rank } : null;
    }).filter(Boolean);

    return NextResponse.json({ suggestions: enriched });
  } catch (e) {
    console.error("[/api/lfg/suggest-mates]", e);
    return NextResponse.json({ suggestions: [] });
  }
}

