import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewArticleForm } from "./new-article-form";


const ALLOWED = ["admin", "moderator", "journalist"];

export default async function NewArticlePage() {
  const session = await getSession().catch(() => null);
  if (!session) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.id)
    .maybeSingle();

  if (!ALLOWED.includes(profile?.role ?? "")) redirect("/articles");

  const { data: games } = await supabase
    .from("games")
    .select("slug, name_ka")
    .order("name_ka");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <NewArticleForm games={games ?? []} authorId={session.id} />
      </div>
    </div>
  );
}
