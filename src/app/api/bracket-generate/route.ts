import { NextRequest, NextResponse } from "next/server";

type Participant = { name: string; rank?: string; winRate?: number };

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:bracket-generate");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:bracket-generate", 10, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:bracket-generate");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ participants?: Participant[]; format?: string; game?: string }>(
    request,
    16 * 1024,
  );
  if (!body.ok) return body.response;

  const { participants, format = "Single Elimination", game } = body.data;
  if (!participants?.length || participants.length < 2) {
    return NextResponse.json({ error: "not_enough_participants" }, { status: 400 });
  }
  if (participants.length > 64) {
    return NextResponse.json({ error: "too_many_participants" }, { status: 400 });
  }

  const participantText = participants
    .map((p, i) => {
      const name = String(p.name ?? "").trim().slice(0, 80);
      const rank = p.rank ? String(p.rank).trim().slice(0, 40) : "";
      const winRate =
        typeof p.winRate === "number" && Number.isFinite(p.winRate)
          ? Math.max(0, Math.min(100, Math.round(p.winRate)))
          : undefined;

      return `${i + 1}. ${name}${rank ? ` (${rank})` : ""}${winRate !== undefined ? ` win-rate: ${winRate}%` : ""}`;
    })
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
              `You are a tournament bracket seeding expert for ${format} format. ` +
              "Based on participant ranks and stats, assign seeds (1=strongest) to create a balanced bracket. " +
              "Ensure top seeds don't face each other early. " +
              'Return JSON: {"seedings": [{"name": "...", "seed": 1, "reason": "short reason in Georgian"}]}',
          },
          {
            role: "user",
            content: `áƒ—áƒáƒ›áƒáƒ¨áƒ˜: ${game ?? "Gaming"}\náƒ¤áƒáƒ áƒ›áƒáƒ¢áƒ˜: ${format}\n\náƒ›áƒáƒœáƒáƒ¬áƒ˜áƒšáƒ”áƒ”áƒ‘áƒ˜:\n${participantText}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.4,
      }),
    });

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? '{"seedings":[]}');
    return NextResponse.json({ seedings: parsed.seedings ?? [] });
  } catch (e) {
    logger.error("bracket seed generation failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

