import { NextRequest, NextResponse } from "next/server";

type MatchResult = { player1: string; player2: string; score1: number; score2: number; winner: string };

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:tournament-summary");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:tournament-summary", 10, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:tournament-summary");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ tournamentName?: string; game?: string; matches?: MatchResult[] }>(
    request,
    16 * 1024,
  );
  if (!body.ok) return body.response;

  const { tournamentName, game, matches } = body.data;
  if (!matches?.length) return NextResponse.json({ error: "no_matches" }, { status: 400 });

  if (matches.length > 64) {
    return NextResponse.json({ error: "too_many_matches" }, { status: 400 });
  }

  const completed = matches.filter((m) => m.winner).slice(0, 64);
  const matchText = completed
    .map((m) => `${m.player1} vs ${m.player2}: ${m.score1}-${m.score2} → ${m.winner}`)
    .join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey.value}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "შენ ხარ ქართული gaming ჟურნალისტი. " +
              "ტურნამენტის შედეგების მიხედვით დაწერე ემოციური, მიმზიდველი რეზიუმე ქართულად (3-4 წინადადება). " +
              "გამოყავი გამარჯვებული, საუკეთესო მატჩი, შთამბეჭდავი მომენტები. " +
              "მხოლოდ ტექსტი დააბრუნე.",
          },
          {
            role: "user",
            content: `ტურნამენტი: ${tournamentName ?? "უცნობი"}\nთამაში: ${game ?? "უცნობი"}\n\nშედეგები:\n${matchText}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    const summary: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) throw new Error("empty");
    return NextResponse.json({ summary });
  } catch (e) {
    logger.error("tournament summary generation failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

