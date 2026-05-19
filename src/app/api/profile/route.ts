import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const update: Partial<typeof profiles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof body.username === "string" && body.username.trim())
    update.username = body.username.trim().slice(0, 32);
  if (typeof body.displayName === "string")
    update.displayName = body.displayName.trim().slice(0, 64) || null;
  if (typeof body.bio === "string")
    update.bio = body.bio.trim() || null;
  if (typeof body.region === "string")
    update.region = body.region.trim() || null;
  if (typeof body.voiceChat === "boolean")
    update.voiceChat = body.voiceChat;

  try {
    await db.update(profiles).set(update).where(eq(profiles.id, user.id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505")
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    console.error("[/api/profile]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
