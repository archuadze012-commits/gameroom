import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updatePostSchema = z.object({
  content: z.string().min(1, "ტექსტი აუცილებელია").max(2000, "პოსტი ზედმეტად გრძელია"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, user] = await Promise.all([params, getSession()]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validated = updatePostSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, profiles!posts_author_id_profiles_id_fk(username)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const content = validated.data.content.trim();
  const { error } = await admin.from("posts").update({ content }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const username = ((post.profiles as { username?: string } | null)?.username ?? "").trim();
  revalidatePath("/");
  revalidatePath("/feed");
  if (username) {
    revalidatePath(`/profile/${username}`);
    revalidatePath(`/profile/${username}/${id}`);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, user, contentAdmin] = await Promise.all([
    params,
    getSession(),
    requirePermission("manage_content"),
  ]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, profiles!posts_author_id_profiles_id_fk(username)")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (post.author_id !== user.id && !contentAdmin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  const username = ((post.profiles as { username?: string } | null)?.username ?? "").trim();
  revalidatePath("/");
  revalidatePath("/feed");
  if (username) {
    revalidatePath(`/profile/${username}`);
    revalidatePath(`/profile/${username}/${id}`);
  }

  return NextResponse.json({ success: true });
}
