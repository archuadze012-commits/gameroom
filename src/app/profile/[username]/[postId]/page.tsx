import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VerifiedBadge } from "@/components/verified-badge";
import { PostContent } from "@/components/post-content";
import { PostDetailActions } from "@/app/feed/[id]/post-detail-actions";
import { PostReactions } from "@/app/feed/[id]/post-reactions";
import { PostComments } from "@/app/feed/[id]/post-comments";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

export async function generateMetadata({ params }: { params: Promise<{ username: string; postId: string }> }) {
  const { postId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("posts")
    .select("content, profiles!posts_author_id_profiles_id_fk(display_name)")
    .eq("id", postId)
    .single();
  if (!data) return { title: "პოსტი" };
  const author = (data.profiles as unknown as { display_name: string } | null)?.display_name ?? "";
  return { title: `${author} — ${data.content.slice(0, 60)}` };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}) {
  const { username, postId } = await params;

  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();

  const [
    { data: post },
    { data: likeRow },
    { data: profile },
    { data: commentRows },
    { data: reactionRows },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url, is_verified, role)")
      .eq("id", postId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("post_comments")
      .select("id, body, created_at, profiles!post_comments_author_id_fkey(username, display_name, avatar_url, is_verified)")
      .eq("post_id", postId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("post_reactions")
      .select("emoji, user_id")
      .eq("post_id", postId),
  ]);

  if (!post) notFound();

  const author = post.profiles as unknown as {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    role?: string | null;
  };

  // Verify that the post author's username matches the URL username parameter
  if (author.username !== username) {
    notFound();
  }

  // aggregate reactions
  const reactionCounts: Record<string, number> = {};
  const myReactions: string[] = [];
  for (const r of reactionRows ?? []) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
    if (r.user_id === user.id) myReactions.push(r.emoji);
  }

  let timeAgoStr = "";
  try {
    timeAgoStr = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka });
  } catch {}

  const currentUser = {
    id: user.id,
    username: profile?.username ?? user.email?.split("@")[0] ?? "",
    displayName: profile?.display_name ?? "",
    avatarUrl: profile?.avatar_url ?? "",
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto max-w-2xl px-4 py-10 lg:py-14 space-y-4">
        <Link
          href="/feed"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          ლენტაზე დაბრუნება
        </Link>

        {/* post card */}
        <Card className="border-border/60">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${author.username}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author.avatar_url ?? ""} alt={author.display_name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-sm">
                    {author.display_name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link
                  href={`/profile/${author.username}`}
                  className="flex items-center gap-1 text-sm font-semibold hover:text-primary transition-colors"
                >
                  {author.display_name || author.username}
                  {author.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                </Link>
                <p className="text-xs text-muted-foreground">{timeAgoStr}</p>
              </div>
            </div>

            <Separator className="border-border/40" />

            <PostContent
              content={post.content}
              mediaUrls={post.media_urls}
              authorRole={author.role}
              authorVerified={author.is_verified}
            />

            <Separator className="border-border/40" />

            {/* reactions */}
            <PostReactions
              postId={post.id}
              initialCounts={reactionCounts}
              initialMine={myReactions}
            />

            <Separator className="border-border/40" />

            {/* like + report */}
            <PostDetailActions
              postId={post.id}
              initialLikes={post.likes_count}
              initialLiked={!!likeRow}
            />
          </CardContent>
        </Card>

        {/* comments card */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <PostComments
              postId={post.id}
              initialComments={(commentRows ?? []) as unknown as Parameters<typeof PostComments>[0]["initialComments"]}
              currentUser={currentUser}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
