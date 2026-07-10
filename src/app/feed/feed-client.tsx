"use client";

import Image from "next/image";
import { useState, useRef, useActionState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Heart, Send, Users, Rss, Newspaper, ArrowRight, ImagePlus, X, Loader2, Sparkles } from "lucide-react";
import { ReportButton } from "@/components/report-button";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeSearchWidget } from "@/components/home-search-widget";
import { VerifiedBadge } from "@/components/verified-badge";
import { PostContent } from "@/components/post-content";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { type FeedPost, type NewsWithGame } from "./page";
import { createPostAction, type PostActionState } from "./actions";
import { PostReactions } from "./[id]/post-reactions";
import { PostOwnerActions } from "@/components/post-owner-actions";

type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  favoriteGameSlugs: string[];
  isAdmin: boolean;
};

type Props = {
  currentUser: CurrentUser;
  initialPosts: FeedPost[];
  initialLikedIds: string[];
  news: NewsWithGame[];
  followingCount: number;
};

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ka });
  } catch {
    return "";
  }
}

export function FeedClient({ currentUser, initialPosts, initialLikedIds, news, followingCount }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(initialLikedIds));
  const [draft, setDraft] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Posts with an in-flight like request — blocks concurrent toggles on the
  // same post (a ref, not state: it's a mutex, not something we render).
  const likeInFlight = useRef<Set<string>>(new Set());

  const initialState: PostActionState = { success: false };
  const [state, formAction, isPending] = useActionState(createPostAction, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        // Reacting to a server-action result delivered via useActionState — the
        // new post arrives as re-rendered state, so prepending it here is the
        // intended pattern, not avoidable derived state.
        if (state.newPost) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPosts((prev) => [state.newPost!, ...prev]);
        }
        setDraft("");
        setMediaUrls([]);
        fetch("/api/badges/check", { method: "POST" }).catch(() => {});
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (mediaUrls.length + files.length > 4) {
      toast.error("მაქსიმუმ 4 სურათი");
      return;
    }
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > 8 * 1024 * 1024) {
            toast.error("მაქს 8MB სურათზე");
            return null;
          }
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from("post_media").upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
          if (error) {
            toast.error(error.message);
            return null;
          }
          const { data: { publicUrl } } = supabase.storage.from("post_media").getPublicUrl(path);
          return publicUrl;
        })
      );
      const okUrls = uploads.filter((u): u is string => !!u);
      setMediaUrls((prev) => [...prev, ...okUrls]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleLike(postId: string) {
    // One in-flight toggle per post. Without this, rapid clicks fire overlapping
    // POSTs against a server-side *toggle* RPC, and out-of-order responses leave
    // the heart/count out of sync with the DB.
    if (likeInFlight.current.has(postId)) return;
    likeInFlight.current.add(postId);

    const isLiked = likedIds.has(postId);
    // Revert the optimistic flip back to the pre-toggle state.
    const revert = () => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p
        )
      );
    };

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
      )
    );
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error("like failed");
      // The RPC returns the authoritative post-toggle liked state. If it landed
      // on our PRE-toggle belief, our optimistic flip was a duplicate/no-op
      // (e.g. already liked in another tab) — revert to stay in sync with the DB.
      const data = (await res.json()) as { liked?: boolean };
      if (typeof data.liked === "boolean" && data.liked === isLiked) {
        revert();
      }
    } catch {
      revert();
    } finally {
      likeInFlight.current.delete(postId);
    }
  }

  const isEmpty = posts.length === 0 && news.length === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      
      {/* Left Column: Feed */}
      <div className="space-y-8 lg:col-span-8">
        
        {/* Header */}
        <div className="group neon-frame rounded-[24px]">
          <div className="relative flex flex-col items-start gap-4 overflow-hidden rounded-[21px] bg-[#0a0714] p-6 backdrop-blur-md sm:flex-row sm:items-center">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_50%)]" />
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Rss className="h-6 w-6 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
            </div>
            <div className="relative">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400 drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]">
                {followingCount > 0 ? `${followingCount} გამოწერილი გეიმერი` : "შენი საინფორმაციო დაფა"}
              </p>
              <h1 className="mt-1 font-display text-[24px] font-black uppercase tracking-tight text-white drop-shadow-md">
                ჩემი ლენტა
              </h1>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="pubg-loadout-link block" data-variant="royale">
          <form action={formAction} className="pubg-loadout-card relative flex gap-4 overflow-hidden p-5 sm:p-6">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
            <Avatar className="relative z-[1] h-12 w-12 shrink-0 border border-white/10 shadow-[0_0_18px_rgba(0,230,255,0.12)]">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} className="object-cover" />
              <AvatarFallback className="bg-[linear-gradient(135deg,var(--gr-magenta),var(--gr-violet-hi))] text-[14px] font-black text-white">
                {(currentUser.displayName || currentUser.username).slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="relative z-[1] flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                    შენი broadcast
                  </p>
                  <h2 className="mt-1 font-display text-[18px] font-black uppercase tracking-[0.04em] text-white">
                    ახალი პოსტი
                  </h2>
                </div>
              </div>
              <Textarea
                name="content"
                ref={textareaRef}
                placeholder="გააზიარე ახალი ამბები, კლიპი ან მოსაზრება..."
                className="min-h-[108px] resize-none rounded-[18px] border border-white/8 bg-black/35 px-4 py-4 text-[14.5px] text-white/90 shadow-inner transition-all placeholder:text-white/28 focus-visible:ring-0 focus-visible:border-[var(--gr-magenta)]/25"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isPending}
              />

              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {mediaUrls.map((url, i) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-[18px] border border-white/10 bg-black/25">
                      <Image src={url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                      <input type="hidden" name="mediaUrls" value={url} />
                      <button
                        type="button"
                        onClick={() => setMediaUrls((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white/70 transition-colors hover:bg-rose-500 hover:text-white"
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={isPending}
              />
              
              <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || mediaUrls.length >= 4 || isPending}
                    className="pubg-loadout-card relative flex h-10 items-center gap-1.5 overflow-hidden px-4 text-[11px] font-black uppercase tracking-[0.16em] text-[#D0F8FF] transition-colors hover:text-white disabled:opacity-50"
                    title="დაამატე სურათი"
                  >
                    <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                    <span className="relative z-[1] flex items-center gap-1.5">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--gr-magenta)]" /> : <ImagePlus className="h-4 w-4 text-[var(--gr-magenta)]" />}
                      სურათი
                    </span>
                  </button>
                  <span className="text-[11px] font-bold tabular-nums text-[#D0F8FF]/55">{draft.length}/2000</span>
                </div>
                
                <Button
                  size="sm"
                  type="submit" 
                  disabled={!draft.trim() || isPending || uploading}
                  className="pubg-loadout-card relative h-12 overflow-hidden px-6 text-[12px] font-black uppercase tracking-[0.18em] text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span className="relative z-[1] flex items-center">
                    <Send className="mr-1.5 h-3.5 w-3.5 text-[var(--gr-magenta)]" />
                    {isPending ? "იგზავნება..." : "გამოქვეყნება"}
                  </span>
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Favorite Games Hint */}
        {currentUser.favoriteGameSlugs.length === 0 && (
          <div className="relative overflow-hidden rounded-[20px] border border-cyan-500/30 bg-cyan-500/10 p-5 backdrop-blur-md">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1),transparent_50%)]" />
            <p className="relative text-[13px] font-medium leading-relaxed text-cyan-200">
              <Sparkles className="inline-block h-4 w-4 mr-2 text-cyan-400" />
              ფავორიტი თამაშები არ გაქვს მითითებული —{" "}
              <Link href="/settings" className="font-bold underline decoration-cyan-500/50 underline-offset-4 hover:text-cyan-100 transition-colors">
                პარამეტრებში
              </Link>{" "}
              დაამატე, რომ მხოლოდ შენი თამაშების სიახლეები გამოჩნდეს.
            </p>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && followingCount === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-white/5 bg-white/5 py-20 text-center backdrop-blur-md">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
              <Users className="h-8 w-8 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-[20px] font-black uppercase text-white drop-shadow-md">
                ჯერ არავინ გამოგიწერია
              </h3>
              <p className="text-[14px] text-white/50 font-medium">
                გამოიწერე სხვა გეიმერები — მათი პოსტები აქ გამოჩნდება.
              </p>
            </div>
            <Link
              href="/search"
              className="mt-4 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all hover:scale-105 hover:bg-cyan-500/20 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]"
            >
              გეიმერების ძებნა <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-6">
          {posts.map((post) => {
            const liked = likedIds.has(post.id);
            const author = post.profiles;
            return (
              <div key={post.id} className="pubg-loadout-link group block" data-variant="strike">
                <Link
                  href={`/profile/${author.username}/${post.id}`}
                  className="absolute inset-0 z-0"
                  aria-label="პოსტის გახსნა"
                />
                
                <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                  <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
                  <div className="relative z-[1] space-y-5">
                    <div className="flex items-center gap-4">
                    <Link href={`/profile/${author.username}`} className="relative z-10 shrink-0">
                      <Avatar className="h-12 w-12 border border-white/10 shadow-[0_0_18px_rgba(0,230,255,0.12)] transition-colors group-hover:border-pink-500/50">
                        <AvatarImage src={author.avatar_url ?? ""} alt={author.display_name} className="object-cover" />
                        <AvatarFallback className="bg-white/10 text-[14px] font-black text-white">
                          {author.display_name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profile/${author.username}`} className="relative z-10 flex items-center gap-1.5 font-display text-[16px] font-black uppercase tracking-[0.04em] text-white transition-colors hover:text-[#D0F8FF] hover:drop-shadow-[0_0_8px_rgba(0,230,255,0.45)]">
                        <span className="truncate">{author.display_name || author.username}</span>
                        {author.is_verified && <VerifiedBadge className="h-4 w-4 shrink-0" />}
                      </Link>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{timeAgo(post.created_at)}</p>
                    </div>
                    <span className="pubg-loadout-card relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#D0F8FF]">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                      <span className="relative z-[1] flex items-center gap-1.5">
                      <Rss className="h-3 w-3" /> პოსტი
                      </span>
                    </span>
                  </div>
                  
                  <div className="relative z-10 pointer-events-none">
                    <PostContent
                      content={post.content}
                      mediaUrls={post.media_urls}
                      authorRole={author.role}
                      authorVerified={author.is_verified}
                    />
                  </div>
                  
                  <div className="relative z-10">
                    <PostReactions postId={post.id} hideHeading />
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`pubg-loadout-card relative flex items-center gap-2 overflow-hidden px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                        liked ? "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" : "text-white/40 hover:text-pink-400"
                      }`}
                    >
                      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                      <span className="relative z-[1] flex items-center gap-2">
                        <Heart className={`h-4 w-4 ${liked ? "fill-pink-500" : ""}`} />
                        {post.likes_count}
                      </span>
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <PostOwnerActions
                        postId={post.id}
                        canEdit={post.author_id === currentUser.id}
                        canDelete={post.author_id === currentUser.id || currentUser.isAdmin}
                        editHref={post.author_id === currentUser.id ? `/profile/${author.username}/${post.id}/edit` : undefined}
                        onDeleted={() => setPosts((prev) => prev.filter((item) => item.id !== post.id))}
                      />
                      <ReportButton targetType="post" targetId={post.id} />
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            );
          })}

          {news.length > 0 && posts.length > 0 && (
            <div className="flex items-center gap-4 py-4">
              <Separator className="flex-1 bg-white/10" />
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                <Newspaper className="h-3 w-3" /> სიახლეები
              </span>
              <Separator className="flex-1 bg-white/10" />
            </div>
          )}

          {news.map((n) => (
            <Link key={n.slug} href={`/news/${n.slug}`}>
              <div className="group neon-frame rounded-[24px]">
                <div className="flex flex-col gap-4 overflow-hidden rounded-[21px] bg-[#0a0714]/80 p-5 backdrop-blur-md sm:flex-row sm:items-center">
                  <div className={`h-20 w-full sm:w-32 shrink-0 rounded-xl bg-gradient-to-br ${n.cover} shadow-inner`} />
                  
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {n.game && (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                          {n.game.nameKa}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                        <Newspaper className="h-3 w-3" /> სიახლე
                      </span>
                    </div>
                    <h3 className="line-clamp-2 font-display text-[16px] font-black uppercase leading-tight text-white group-hover:text-cyan-400 transition-colors">
                      {n.title}
                    </h3>
                    <p className="line-clamp-1 text-[13px] font-medium text-white/50">{n.excerpt}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      {n.publishedAt} · {n.readMinutes} წთ
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="space-y-6 lg:col-span-4">
        <HomeNotificationsWidget />
        
        <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/5 p-6 backdrop-blur-md">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.1),transparent_70%)]" />
          <h3 className="relative mb-5 flex items-center gap-2 font-display text-[14px] font-black uppercase tracking-[0.2em] text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
            <Users className="h-4 w-4" /> მოთამაშეების ძებნა
          </h3>
          <div className="relative">
            <HomeSearchWidget />
          </div>
        </div>
      </div>
      
    </div>
  );
}
