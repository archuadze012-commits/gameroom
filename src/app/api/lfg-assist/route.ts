import { NextRequest, NextResponse } from "next/server";
import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg-assist");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "ai:lfg-assist", 10, 60_000);
  if (!guard.ok) return guard.response;

  const groqKey = requireServerEnv("GROQ_API_KEY", "api:lfg-assist");
  if (!groqKey.ok) return NextResponse.json({ error: "no_key" }, { status: 500 });

  const body = await readJsonObject<{ prompt?: string; game?: string }>(request, 8 * 1024);
  if (!body.ok) return body.response;

  const prompt = (body.data.prompt ?? "").trim().slice(0, 1000);
  if (!prompt) return NextResponse.json({ error: "empty" }, { status: 400 });

  const game = body.data.game ? `თამაში: ${body.data.game.slice(0, 80)}` : "";

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
              "შენ ხარ ასისტენტი Georgian gaming community საიტზე (gameroom.com.ge). " +
              "მომხმარებელი ეძებს teammate-ებს. მისი მოკლე აღწერის მიხედვით გენერირე: " +
              "სათაური (მაქს 60 სიმბოლო, მიმზიდველი) და აღწერა (2-3 წინადადება ქართულად). " +
              'მხოლოდ JSON დააბრუნე: {"title": "...", "description": "..."}',
          },
          { role: "user", content: `${game}\n${prompt}` },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      // Bound the upstream call so provider slowness can't hang the invocation;
      // the aborted fetch rejects into the existing catch fallback below.
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();

    if (!res.ok) {
      logger.error("Groq returned an error", { status: res.status, error: json?.error });
      return NextResponse.json({ error: "openai_error", detail: json?.error?.message }, { status: 500 });
    }

    const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`no json in: ${text.slice(0, 200)}`);
    const parsed = JSON.parse(match[0]);
    if (!parsed.title || !parsed.description) throw new Error("bad format");
    return NextResponse.json({ title: parsed.title, description: parsed.description });
  } catch (e) {
    logger.error("LFG assist generation failed", { error: e });
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}

