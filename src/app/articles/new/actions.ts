"use server";

import { redirect } from "next/navigation";
import postgres from "postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { ensureArticlesSchema } from "@/lib/articles-migrate";

const ALLOWED = ["admin", "moderator", "journalist"];

function slugify(text: string) {
  return "article-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createArticle(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("ავტორიზაცია საჭიროა");

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", session.id)
    .maybeSingle();

  if (!ALLOWED.includes(profile?.role ?? "")) {
    throw new Error("არ გაქვს უფლება (current role: " + (profile?.role ?? "unknown") + ")");
  }

  const title = (formData.get("title") as string).trim();
  const excerpt = (formData.get("excerpt") as string).trim() || null;
  const content = (formData.get("content") as string).trim();
  const cover_url = (formData.get("cover_url") as string).trim() || null;
  const game_slug = (formData.get("game_slug") as string) || null;
  const publish = formData.get("publish") === "true";

  if (!title || !content) throw new Error("სათაური და კონტენტი სავალდებულოა");

  const slug = slugify(title);
  const publishedAt = publish ? new Date().toISOString() : null;

  // Ensure schema exists in the actual app DB (idempotent, runs once per process)
  await ensureArticlesSchema();

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = postgres(url, { prepare: false, max: 1 });
  try {
    await db`
      INSERT INTO public.articles (slug, title, excerpt, content, cover_url, game_slug, author_id, published, published_at)
      VALUES (${slug}, ${title}, ${excerpt}, ${content}, ${cover_url}, ${game_slug}, ${session.id}, ${publish}, ${publishedAt})
    `;
  } finally {
    await db.end({ timeout: 5 });
  }

  redirect("/articles");
}
