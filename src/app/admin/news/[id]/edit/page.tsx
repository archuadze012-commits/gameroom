import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NewsForm, type NewsGameOption, type NewsInitial } from "../../news-form";

export const metadata = { title: "Admin · სტატიის რედაქტირება" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const [{ data: article }, { data: games }] = await Promise.all([
    admin
      .from("news_articles")
      .select("id, title, body, excerpt, cover_url, game_id, status")
      .eq("id", id)
      .maybeSingle(),
    admin.from("games").select("id, name_ka").eq("active", true).order("position", { ascending: true }),
  ]);

  if (!article) notFound();

  const options: NewsGameOption[] = (games ?? []).map((g) => ({ id: g.id, nameKa: g.name_ka }));
  const initial: NewsInitial = {
    id: article.id,
    title: article.title,
    body: article.body,
    excerpt: article.excerpt,
    coverUrl: article.cover_url,
    gameId: article.game_id,
    status: article.status,
  };
  return <NewsForm games={options} initial={initial} />;
}
