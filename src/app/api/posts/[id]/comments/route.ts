import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";

const logger = createLogger("api:post-comments");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, body, created_at, profiles!post_comments_author_id_profiles_id_fk(username, display_name, avatar_url, is_verified)")
    .eq("post_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getSession().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`post-comment:${user.id}`, 15, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { body?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const text = (body.body ?? "").trim();
  if (!text || text.length > 1000)
    return NextResponse.json({ error: "Comment must be 1–1000 chars" }, { status: 400 });

  // Blocklist + toxicity gate before the comment is stored.
  const mod = await moderateText(text).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: post, error: postError } = await admin
    .from("posts")
    .select("id, profiles!posts_author_id_profiles_id_fk(username)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError) {
    logger.error("failed to load post before comment", { postId: id, userId: user.id, error: postError });
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, banned")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.error("failed to load profile before comment", { postId: id, userId: user.id, error: profileError });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (profile?.banned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!profile) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const rawUsername = typeof metadata.username === "string" ? metadata.username : "";
    const rawDisplayName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : "";
    const rawAvatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url.trim() : "";
    const emailPrefix = (user.email?.split("@")[0] ?? "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "user";
    const usernameBase = rawUsername.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || emailPrefix;
    const fallbackUsername = `${usernameBase}_${user.id.slice(0, 6)}`;

    const { error: createProfileError } = await admin.from("profiles").insert({
      id: user.id,
      username: fallbackUsername,
      display_name: rawDisplayName || user.email?.split("@")[0] || "user",
      avatar_url: rawAvatarUrl || null,
      email: user.email ?? null,
    });

    if (createProfileError) {
      logger.error("failed to auto-create profile before comment", {
        postId: id,
        userId: user.id,
        error: createProfileError,
      });
      return NextResponse.json({ error: "Failed to prepare profile" }, { status: 500 });
    }
  }

  const { data, error } = await admin
    .from("post_comments")
    .insert({ post_id: id, author_id: user.id, body: text })
    .select("id, body, created_at, profiles!post_comments_author_id_profiles_id_fk(username, display_name, avatar_url, is_verified)")
    .single();

  if (error || !data) {
    logger.error("failed to insert post comment", { postId: id, userId: user.id, error });
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }

  const authorUsername = ((post.profiles as { username?: string } | null)?.username ?? "").trim();
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/feed/${id}`);
  if (authorUsername) {
    revalidatePath(`/profile/${authorUsername}`);
    revalidatePath(`/profile/${authorUsername}/${id}`);
  }

  return NextResponse.json(data, { status: 201 });
}
