import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { ilike, or, and, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  try {
    const condition = and(
      eq(profiles.banned, false),
      q
        ? or(
            ilike(profiles.username, `%${q}%`),
            ilike(profiles.displayName, `%${q}%`),
          )
        : undefined,
    );

    const rows = await db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        role: profiles.role,
        region: profiles.region,
        voiceChat: profiles.voiceChat,
        bio: profiles.bio,
      })
      .from(profiles)
      .where(condition)
      .orderBy(profiles.createdAt);

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[/api/users]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
