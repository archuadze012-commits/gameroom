import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

type LfgPost = { id: string; title: string; description: string | null; rank: string | null };
const logger = createLogger("api:lfg-suggest-mates");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:lfg-suggest-mates", 10, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = getServerEnv("GROQ_API_KEY");
  if (!groqKey) return NextResponse.json({ suggestions: [] });

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
    .map((p, i) => `[${i + 1}] ID:${p.id} | "${p.title}"${p.rank ? ` | რანკი: ${p.rank}` : ""}${p.description ? ` | ${p.description.slice(0, 80)}` : ""}`)
    .join("\n");

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
              "შენ ხარ gaming teammate matching სისტემა. " +
              "შეადარე მთავარი LFG პოსტი კანდიდატებს და შეარჩიე 3 ყველაზე შეთავსებადი. " +
              "გამოიყენე: რანკი, სტილი, მოთხოვნები. " +
              'დააბრუნე JSON: {"suggestions": [{"id": "...", "reason": "მოკლე მიზეზი ქართულად"}]}',
          },
          {
            role: "user",
            content: `მთავარი: "${title}"${description ? ` — ${description.slice(0, 150)}` : ""}\n\nკანდიდატები:\n${candidatesText}`,
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
    logger.warn("LFG mate suggestion failed", { error: e });
    return NextResponse.json({ suggestions: [] });
  }
}

