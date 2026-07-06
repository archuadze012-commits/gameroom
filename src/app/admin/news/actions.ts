"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-news-actions");

const STATUSES = ["draft", "published", "archived"] as const;
type ArticleStatus = (typeof STATUSES)[number];

export type AdminNewsResult = { ok: true; id?: string } | { ok: false; error: string };

export type NewsInput = {
  title: string;
  body: string;
  excerpt?: string;
  coverUrl?: string;
  gameId?: string;
  status: string;
};

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "article"}-${suffix}`;
}

function validate(input: NewsInput): { title: string; body: string; status: ArticleStatus } | { error: string } {
  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (!title || title.length > 200) return { error: "სათაური სავალდებულოა (მაქს. 200 სიმბოლო)" };
  if (!body) return { error: "ტექსტი სავალდებულოა" };
  const status: ArticleStatus = STATUSES.includes(input.status as ArticleStatus) ? (input.status as ArticleStatus) : "draft";
  return { title, body, status };
}

export async function createNewsAction(input: NewsInput): Promise<AdminNewsResult> {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return { ok: false, error: auth.status === 401 ? "ავტორიზაცია აუცილებელია" : "წვდომა აკრძალულია" };

  const v = validate(input);
  if ("error" in v) return { ok: false, error: v.error };

  const admin = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const slug = makeSlug(v.title);
    const { data, error } = await admin
      .from("news_articles")
      .insert({
        author_id: auth.userId,
        title: v.title,
        slug,
        body: v.body,
        excerpt: input.excerpt?.trim() || null,
        cover_url: input.coverUrl?.trim() || null,
        game_id: input.gameId || null,
        status: v.status,
        published_at: v.status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .maybeSingle();
    if (!error && data) {
      revalidatePath("/admin/news");
      revalidatePath("/news");
      return { ok: true, id: data.id };
    }
    if (error && error.code !== "23505") {
      logger.error("failed to create news article", { userId: auth.userId, error });
      return { ok: false, error: "შენახვა ვერ მოხერხდა" };
    }
  }
  return { ok: false, error: "შენახვა ვერ მოხერხდა (slug კონფლიქტი)" };
}

export async function updateNewsAction(id: string, input: NewsInput): Promise<AdminNewsResult> {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return { ok: false, error: auth.status === 401 ? "ავტორიზაცია აუცილებელია" : "წვდომა აკრძალულია" };
  if (!id) return { ok: false, error: "id required" };

  const v = validate(input);
  if ("error" in v) return { ok: false, error: v.error };

  const admin = createSupabaseAdminClient();

  // Stamp published_at the first time it goes to 'published', keep it otherwise.
  const { data: current } = await admin.from("news_articles").select("status, published_at").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "სტატია ვერ მოიძებნა" };
  let publishedAt: string | null = current.published_at;
  if (v.status === "published" && !current.published_at) publishedAt = new Date().toISOString();
  if (v.status !== "published") publishedAt = current.status === "published" ? current.published_at : null;

  const { error } = await admin
    .from("news_articles")
    .update({
      title: v.title,
      body: v.body,
      excerpt: input.excerpt?.trim() || null,
      cover_url: input.coverUrl?.trim() || null,
      game_id: input.gameId || null,
      status: v.status,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    logger.error("failed to update news article", { userId: auth.userId, id, error });
    return { ok: false, error: "განახლება ვერ მოხერხდა" };
  }
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true, id };
}

export async function deleteNewsAction(id: string): Promise<AdminNewsResult> {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return { ok: false, error: auth.status === 401 ? "ავტორიზაცია აუცილებელია" : "წვდომა აკრძალულია" };
  if (!id) return { ok: false, error: "id required" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("news_articles").delete().eq("id", id);
  if (error) {
    logger.error("failed to delete news article", { userId: auth.userId, id, error });
    return { ok: false, error: "წაშლა ვერ მოხერხდა" };
  }
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true };
}
