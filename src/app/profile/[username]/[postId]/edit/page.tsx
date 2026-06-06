import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PostEditForm } from "./post-edit-form";


export default async function EditPostPage({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}) {
  const { username, postId } = await params;
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, content, media_urls, profiles!posts_author_id_profiles_id_fk(username)")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!post) notFound();
  const author = post.profiles as { username?: string } | null;
  if (post.author_id !== user.id || author?.username !== username) {
    redirect(`/profile/${username}/${postId}`);
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto max-w-2xl px-4 py-10 lg:py-14 space-y-5">
        <Link
          href={`/profile/${username}/${postId}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--gr-text-dim)] transition-colors hover:text-[var(--gr-cyan-glow)]"
        >
          <ArrowLeft className="h-4 w-4" />
          პოსტზე დაბრუნება
        </Link>

        <h1 className="font-display text-[24px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
          პოსტის რედაქტირება
        </h1>

        <PostEditForm
          postId={postId}
          username={username}
          initialContent={post.content}
          mediaUrls={post.media_urls}
        />
      </div>
    </div>
  );
}
