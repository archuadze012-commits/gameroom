import Link from "next/link";
import { Plus, MapPin, Mic, Users as UsersIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { LfgFilters } from "./lfg-filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export const metadata = { title: "ლოკალი — გუნდის ძებნა" };
export const dynamic = "force-dynamic";

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

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default async function LfgPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; region?: string; voice?: string; mode?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();

  const session = await getSession().catch(() => null);
  let favoriteSlugs: string[] = [];
  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_game_slugs")
      .eq("id", session.id)
      .maybeSingle();
    favoriteSlugs = (profile?.favorite_game_slugs as string[] | null) ?? [];
  }

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  let query = supabase
    .from("lfg_posts")
    .select(
      "id, game_slug, title, description, rank, region, slots_total, voice_required, created_at, profiles!lfg_posts_author_id_fkey(username, display_name, avatar_url)"
    )
    .is("deleted_at", null)
    .gt("created_at", tenMinAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.game) query = query.eq("game_slug", params.game);
  if (params.mode) query = query.eq("mode", params.mode);
  if (params.region) query = query.eq("region", params.region);
  if (params.voice === "1") query = query.eq("voice_required", true);

  const { data } = await query;
  const posts = (data ?? []) as unknown as LfgRow[];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <PageHeader
          eyebrow="გუნდის ძებნა"
          title="LIVE ლოკალი"
          description="იპოვე მოთამაშეები შენი თამაშისთვის, რანკისა და რეგიონის მიხედვით."
          actions={
            <ChevronButton href="/lfg/new" variant="violet" size="md">
              <Plus className="h-4 w-4" /> ლოკალის დაპოსტვა
            </ChevronButton>
          }
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <LfgFilters favoriteSlugs={favoriteSlugs} />
          </aside>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <EmptyState
                tone="violet"
                illustration={<UsersIcon className="h-9 w-9 text-[var(--gr-violet-hi)]" />}
                title="ჯერ არცერთი ლოკალი არ არის"
                description="გახდი პირველი ვინც დაპოსტავს გუნდის ძებნას."
                action={
                  <ChevronButton href="/lfg/new" variant="violet" size="md">
                    <Plus className="h-4 w-4" /> ლოკალის დაპოსტვა
                  </ChevronButton>
                }
              />
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
                  <article
                    key={post.id}
                    className="relative isolate transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
                  >
                    <div
                      className="relative bg-[var(--gr-bg-1)] p-5 gr-sweep"
                      style={{ clipPath: cutMd }}
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
                      <div className="flex gap-4">
                        {/* Author */}
                        <div className="flex shrink-0 flex-col items-center gap-2 w-24">
                          {authorUsername ? (
                            <Link href={`/profile/${authorUsername}`} className="group flex flex-col items-center gap-2">
                              <Avatar className="h-16 w-16 border-2 border-[var(--gr-border-hi)] transition-colors group-hover:border-[var(--gr-violet-hi)]">
                                <AvatarImage src={author?.avatar_url ?? undefined} alt={displayName} />
                                <AvatarFallback className="bg-[var(--gr-violet)]/15 text-lg text-[var(--gr-violet-hi)]">
                                  {displayName.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-center text-[12.5px] font-semibold leading-tight text-[var(--gr-text)] line-clamp-2 break-words group-hover:text-[var(--gr-violet-hi)]">
                                {displayName}
                              </span>
                            </Link>
                          ) : (
                            <>
                              <Avatar className="h-16 w-16 border-2 border-[var(--gr-border-hi)]">
                                <AvatarFallback className="bg-[var(--gr-violet)]/15 text-lg text-[var(--gr-violet-hi)]">?</AvatarFallback>
                              </Avatar>
                              <span className="text-center text-[12.5px] font-semibold text-[var(--gr-text-mute)] line-clamp-2 break-words">
                                {displayName}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Right */}
                        <div className="min-w-0 flex-1">
                          <Link href={`/lfg/${post.id}`} className="block">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-display text-[17px] font-bold uppercase tracking-tight text-[var(--gr-text)] hover:text-[var(--gr-violet-hi)] line-clamp-2">
                                {post.title}
                              </h3>
                              <Pill tone="accent" icon={<UsersIcon className="h-3 w-3" />}>
                                0/{post.slots_total}
                              </Pill>
                            </div>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">{createdAgo}</p>
                            {post.description && (
                              <p className="mt-2 line-clamp-3 text-[13px] text-[var(--gr-text-mute)]">
                                {post.description}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {post.rank && <Pill tone="amber">🏅 {post.rank}</Pill>}
                              {post.region && (
                                <Pill tone="cyan" icon={<MapPin className="h-3 w-3" />}>
                                  {post.region}
                                </Pill>
                              )}
                              {post.voice_required && (
                                <Pill tone="violet" icon={<Mic className="h-3 w-3" />}>voice</Pill>
                              )}
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
