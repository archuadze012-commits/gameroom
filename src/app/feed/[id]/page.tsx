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
import { PostDetailActions } from "./post-detail-actions";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("posts")
    .select("content, profiles!posts_author_id_fkey(display_name)")
    .eq("id", id)
    .single();
  if (!data) return { title: "პოსტი" };
  const author = (data.profiles as unknown as { display_name: string } | null)?.display_name ?? "";
  return { title: `${author} — ${data.content.slice(0, 60)}` };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_fkey(username, display_name, avatar_url, is_verified, role)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!post) notFound();

  const { data: likeRow } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", id)
    .maybeSingle();

  const author = post.profiles as unknown as {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    role?: string | null;
  };

  let timeAgoStr = "";
  try {
    timeAgoStr = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka });
  } catch {}

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <Link
          href="/feed"
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          ლენტაზე დაბრუნება
        </Link>

        <Card className="border-border/60">
          <CardContent className="space-y-4 p-5">
            {/* author */}
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

            {/* content */}
            <PostContent
              content={post.content}
              mediaUrls={post.media_urls}
              authorRole={author.role}
              authorVerified={author.is_verified}
            />

            <Separator className="border-border/40" />

            {/* actions */}
            <PostDetailActions
              postId={post.id}
              initialLikes={post.likes_count}
              initialLiked={!!likeRow}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
