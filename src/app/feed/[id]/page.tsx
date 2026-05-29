import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PostRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from("posts")
    .select("profiles!posts_author_id_profiles_id_fk(username)")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  const author = post.profiles as unknown as { username: string } | null;
  if (!author?.username) notFound();

  redirect(`/profile/${author.username}/${id}`);
}
