import Link from "next/link";
import { Plus, MapPin, Mic, Users as UsersIcon, Radio, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LfgFilters } from "./lfg-filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PremiumCard } from "@/components/ui/premium-card";

export const metadata = { title: "ლოკალი — გუნდის ძებნა" };

type LfgRow = {
  id: string;
  game_slug: string;
  title: string;
  description: string;
  rank: string | null;
  region: string | null;
  slots_total: number;
  voice_required: boolean;
  created_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default async function LfgPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; region?: string; voice?: string; mode?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("lfg_posts")
    .select(
      "id, game_slug, title, description, rank, region, slots_total, voice_required, created_at, profiles(username, display_name, avatar_url)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.game) query = query.eq("game_slug", params.game);
  if (params.mode) query = query.eq("mode", params.mode);
  if (params.region) query = query.eq("region", params.region);
  if (params.voice === "1") query = query.eq("voice_required", true);

  const { data, error } = await query;
  if (error) console.error("LFG Query Error:", error);
  const posts = (data ?? []) as unknown as LfgRow[];
  const activeFilterCount = [params.game, params.mode, params.region, params.voice].filter(Boolean).length;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Cinematic Ambient Background */}
      <CinematicBackground color="cyan" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <PageHeader
          color="cyan"
          eyebrow={
            <span className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>LFG Radar</span>
            </span>
          }
          title="გუნდის ძებნა"
          description="იპოვე თანაგუნდელები შენი თამაშისთვის, რეჟიმისა და რეგიონის მიხედვით."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/80">
                <span className="text-pink-400">{posts.length}</span> აქტიური
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/80">
                  <span className="text-violet-400">{activeFilterCount}</span> ფილტრი
                </span>
              )}
              <Link
                href="/lfg/new"
                className="group flex items-center justify-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all hover:scale-105 hover:bg-cyan-500/20 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] md:shrink-0"
              >
                <Plus className="h-4 w-4" /> ლოკალის დაპოსტვა
              </Link>
            </div>
          }
        />

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <LfgFilters />
          </aside>

          <div className="space-y-5">
            {posts.length === 0 ? (
              <PremiumCard noHover className="py-20 text-center flex flex-col items-center justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-pink-500/10 shadow-[0_0_30px_rgba(236,72,153,0.2)]">
                  <UsersIcon className="h-10 w-10 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                </div>
                <h2 className="mt-6 font-display text-[24px] font-black uppercase tracking-tight text-white drop-shadow-md">
                  ჯერ არცერთი ლოკალი არ არის
                </h2>
                <p className="mt-2 max-w-md text-[15px] text-white/50 font-medium">
                  გახდი პირველი ვინც დაპოსტავს გუნდის ძებნას და დაიწყე თამაში დღესვე.
                </p>
                <Link
                  href="/lfg/new"
                  className="mt-8 flex items-center justify-center gap-2 rounded-full bg-white text-black px-8 py-3.5 text-[13px] font-black uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                >
                  <Plus className="h-4 w-4" /> ლოკალის დაპოსტვა
                </Link>
              </PremiumCard>
            ) : (
              posts.map((post) => {
                const author = post.profiles;
                const authorUsername = author?.username ?? null;
                const displayName = author?.display_name ?? authorUsername ?? "გამოუცნობი";
                const createdAgo = (() => {
                  try {
                    return formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka });
                  } catch {
                    return "";
                  }
                })();
                return (
                  <PremiumCard key={post.id} glowVariant="tight" className="backdrop-blur-md !p-0 h-auto">
                    <div className="relative flex-1 p-5 sm:p-6">
                      <div className="flex gap-4 sm:gap-6">
                        
                        {/* Author */}
                        <div className="flex w-20 shrink-0 flex-col items-center gap-3">
                          {authorUsername ? (
                            <Link href={`/profile/${authorUsername}`} className="group/avatar flex flex-col items-center gap-2">
                              <div className="relative rounded-full p-[2px] transition-all duration-300 bg-white/10 group-hover/avatar:bg-gradient-to-br group-hover/avatar:from-cyan-400 group-hover/avatar:to-pink-500">
                                <Avatar className="h-16 w-16 border-2 border-[#0a0714]">
                                  <AvatarImage src={author?.avatar_url ?? undefined} alt={displayName} className="object-cover" />
                                  <AvatarFallback className="bg-white/5 text-lg font-black text-white">
                                    {displayName.slice(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <span className="line-clamp-2 text-center text-[12px] font-black uppercase tracking-wider text-white/70 transition-colors group-hover/avatar:text-pink-400">
                                {displayName}
                              </span>
                            </Link>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Avatar className="h-16 w-16 border-2 border-white/10">
                                <AvatarFallback className="bg-white/5 text-lg font-black text-white">?</AvatarFallback>
                              </Avatar>
                              <span className="line-clamp-2 text-center text-[12px] font-black uppercase tracking-wider text-white/40">
                                {displayName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right Content */}
                        <div className="min-w-0 flex-1">
                          <Link href={`/lfg/${post.id}`} className="block h-full flex flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="line-clamp-2 font-display text-[18px] font-black uppercase leading-tight text-white transition-colors group-hover:text-pink-400 sm:text-[20px] drop-shadow-sm">
                                {post.title}
                              </h3>
                              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                                <UsersIcon className="h-3 w-3" />
                                0/{post.slots_total}
                              </span>
                            </div>
                            
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {post.game_slug && (
                                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                                  {post.game_slug.replaceAll("-", " ")}
                                </span>
                              )}
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{createdAgo}</p>
                            </div>
                            
                            {post.description && (
                              <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-white/50 font-medium">
                                {post.description}
                              </p>
                            )}
                            
                            <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                              {post.rank && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                                  <Sparkles className="h-3 w-3" /> {post.rank}
                                </span>
                              )}
                              {post.region && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.1)]">
                                  <MapPin className="h-3 w-3" /> {post.region}
                                </span>
                              )}
                              {post.voice_required && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.1)]">
                                  <Mic className="h-3 w-3" /> Voice
                                </span>
                              )}
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </PremiumCard>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
