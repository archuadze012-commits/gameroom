import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { PROFILE_SHORT_TEXT_MAX_LENGTH } from "@/lib/constants";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:translate");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:translate", 30, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:translate");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ text?: string; targetLang?: string }>(request, 8 * 1024);
  if (!body.ok) return body.response;

  const text = (body.data.text ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const target = (body.data.targetLang ?? "ქართული").slice(0, PROFILE_SHORT_TEXT_MAX_LENGTH);

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
            content: `თარგმნე შემდეგი ტექსტი ${target} ენაზე. მხოლოდ თარგმანი დააბრუნე, სხვა არაფერი.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    const translated: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!translated) throw new Error("empty");
    return NextResponse.json({ translated });
  } catch (e) {
    logger.error("translation failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

