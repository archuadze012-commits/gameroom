import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NewsForm, type NewsGameOption } from "../news-form";

export const metadata = { title: "Admin · ახალი სტატია" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const admin = createSupabaseAdminClient();
  const { data: games } = await admin
    .from("games")
    .select("id, name_ka")
    .eq("active", true)
    .order("position", { ascending: true });
  const options: NewsGameOption[] = (games ?? []).map((g) => ({ id: g.id, nameKa: g.name_ka }));
  return <NewsForm games={options} />;
}
