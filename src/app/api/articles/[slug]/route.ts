import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getIsAdmin, getSession } from "@/lib/auth";
import { deleteArticleBySlug, getArticleForEditor, updateArticleBySlug } from "@/lib/articles-db";

const updateArticleSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional().or(z.literal("")),
  content: z.string().min(1),
  cover_url: z.string().optional().or(z.literal("")),
  game_slug: z.string().optional().or(z.literal("")),
  publish: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const [{ slug }, user] = await Promise.all([params, getSession()]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await getArticleForEditor(decodeURIComponent(slug)).catch(() => null);
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (article.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const validated = updateArticleSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = validated.data;
  const publish = data.publish;
  await updateArticleBySlug({
    slug: article.slug,
    title: data.title.trim(),
    excerpt: data.excerpt?.trim() || null,
    content: data.content.trim(),
    cover_url: data.cover_url?.trim() || null,
    game_slug: data.game_slug?.trim() || null,
    published: publish,
    published_at: publish ? article.published_at ?? new Date().toISOString() : null,
  });

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath(`/articles/${encodeURIComponent(article.slug)}`);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const [{ slug }, user, isAdmin] = await Promise.all([params, getSession(), getIsAdmin()]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await getArticleForEditor(decodeURIComponent(slug)).catch(() => null);
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (article.author_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteArticleBySlug(article.slug);

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath(`/articles/${encodeURIComponent(article.slug)}`);

  return NextResponse.json({ success: true });
}
