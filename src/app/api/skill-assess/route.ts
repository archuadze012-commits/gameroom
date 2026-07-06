import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:skill-assess");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:skill-assess", 10, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:skill-assess");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ game?: string; rank?: string; description?: string }>(request, 8 * 1024);
  if (!body.ok) return body.response;

  const game = (body.data.game ?? "").trim().slice(0, 80);
  const rank = (body.data.rank ?? "").trim().slice(0, 80);
  const description = (body.data.description ?? "").trim().slice(0, 300);

  if (!game) return NextResponse.json({ error: "game_required" }, { status: 400 });

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
              "შენ ხარ gaming skill assessor. მოთამაშის მიწოდებული ინფორმაციის მიხედვით: " +
              "1) მიეცი tier სახელი (Bronze/Silver/Gold/Platinum/Diamond/Master/Grandmaster) " +
              "2) მოკლე ანალიზი ქართულად (2 წინადადება) " +
              "3) 2 კონკრეტული რჩევა გაუმჯობესებისთვის " +
              'JSON-ად: {"tier": "...", "analysis": "...", "tips": ["...", "..."]}',
          },
          {
            role: "user",
            content: `თამაში: ${game}${rank ? `\nრანკი/დონე: ${rank}` : ""}${description ? `\nდამატებითი: ${description}` : ""}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.6,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? "{}");
    if (!parsed.tier) throw new Error("bad format");
    return NextResponse.json(parsed);
  } catch (e) {
    logger.error("skill assessment failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

