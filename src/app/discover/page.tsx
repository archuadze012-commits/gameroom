import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, Users2, Sparkles, Gamepad2, UserCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { FollowButton } from "@/components/follow-button";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { isOnline } from "@/lib/presence";

export const metadata = { title: "აღმოაჩინე მოთამაშეები" };

type Candidate = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number | null;
  last_seen_at: string | null;
  mutual_count: number;
  shared_games: number;
};

// Discovery / "find people". Recommendation-driven counterpart to the text
// search on /search: instead of typing a name, the signed-in user is shown who
// to follow next, ranked by the get_suggested_follows RPC (friends-of-friends +
// shared favorite games). When the graph is too thin to rank (brand-new user),
// a fallback of active players keeps the page alive instead of showing a dead
// empty state.
export default async function DiscoverPage() {
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();

  const [{ data: suggested }, { data: followRows }] = await Promise.all([
    supabase.rpc("get_suggested_follows", { p_user: user.id, p_limit: 18 }),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
  ]);

  const suggestions = (suggested ?? []) as Candidate[];
  const followingIds = new Set(
    (followRows ?? []).map((r: { following_id: string }) => r.following_id),
  );

  // Fallback: when the social graph gives few/no ranked suggestions (new user,
  // no follows, no favorite games), surface active players so the page is never
  // dead. Recommendation-flavored (most-recently-active), not a text search, so
  // it complements /search rather than duplicating it.
  let fallback: Candidate[] = [];
  if (suggestions.length < 6) {
    const suggestedIds = new Set(suggestions.map((s) => s.id));
    const { data: active } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level, last_seen_at")
      .eq("banned", false)
      .not("username", "is", null)
      .neq("id", user.id)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .order("level", { ascending: false, nullsFirst: false })
      .limit(24);
    fallback = ((active ?? []) as Omit<Candidate, "mutual_count" | "shared_games">[])
      .filter((p) => !followingIds.has(p.id) && !suggestedIds.has(p.id))
      .slice(0, 12)
      .map((p) => ({ ...p, mutual_count: 0, shared_games: 0 }));
  }

  const nothing = suggestions.length === 0 && fallback.length === 0;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="violet" />

      <div className="container relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <PageHeader
          color="violet"
          eyebrow="Find your squad"
          title={
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 shadow-[0_0_15px_rgba(190,242,100,0.2)]">
                <Compass className="h-5 w-5 text-[var(--gr-lime)]" />
              </span>
              <span>აღმოაჩინე</span>
            </span>
          }
          description="იპოვე ახალი მოთამაშეები — შენი წრისა და თამაშების მიხედვით"
        />

        {nothing ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-10">
            {suggestions.length > 0 && (
              <Section
                icon={<Users2 className="h-4 w-4" />}
                title="შესაძლოა იცნობდე"
                subtitle="შენი მეგობრებისა და თამაშების მიხედვით"
              >
                <CardGrid people={suggestions} />
              </Section>
            )}

            {fallback.length > 0 && (
              <Section
                icon={<Sparkles className="h-4 w-4" />}
                title="აქტიური მოთამაშეები"
                subtitle="ახლახან იყვნენ ონლაინ — დაიწყე მათი გამოწერით"
              >
                <CardGrid people={fallback} />
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="flex items-center gap-2 font-display text-[13px] font-black uppercase tracking-[0.2em] text-[var(--gr-lime)] drop-shadow-[0_0_8px_rgba(190,242,100,0.4)]">
          {icon} {title}
        </h2>
        <p className="mt-1 text-[12px] font-semibold text-white/40">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function CardGrid({ people }: { people: Candidate[] }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => (
        <DiscoverCard key={p.id} person={p} />
      ))}
    </div>
  );
}

function DiscoverCard({ person }: { person: Candidate }) {
  const online = isOnline(person.last_seen_at);
  const reason =
    person.mutual_count > 0
      ? `${person.mutual_count} საერთო მეგობარი`
      : person.shared_games > 0
        ? `${person.shared_games} საერთო თამაში`
        : online
          ? "ონლაინ ახლა"
          : "რეკომენდებული";
  const ReasonIcon =
    person.mutual_count > 0 ? UserCheck : person.shared_games > 0 ? Gamepad2 : Sparkles;

  return (
    <div className="pubg-loadout-link group relative block" data-variant="royale">
      <div className="pubg-loadout-card relative overflow-hidden p-4">
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span
          aria-hidden
          className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] bg-[var(--gr-lime)]/70"
        />
        <div className="relative z-[1] flex items-center gap-3">
          <Link href={`/profile/${person.username}`} className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={person.avatar_url || "/default-avatar.svg"}
              alt={person.display_name || person.username}
              className="h-12 w-12 rounded-full border border-white/10 object-cover transition-transform group-hover:scale-105 group-hover:border-[var(--gr-lime)]/50"
            />
            {online && (
              <span
                aria-label="ონლაინ"
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0714] bg-[var(--gr-lime)] shadow-[0_0_8px_rgba(190,242,100,0.9)]"
              />
            )}
          </Link>

          <Link href={`/profile/${person.username}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14px] font-bold text-white/90 group-hover:text-[var(--gr-lime)]">
                {person.display_name || person.username}
              </p>
              {person.level != null && (
                <span className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-300">
                  Lv{person.level}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-[var(--gr-lime)]/70">
              <ReasonIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{reason}</span>
            </p>
          </Link>

          <div className="shrink-0">
            <FollowButton username={person.username} initialFollowing={false} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--gr-lime)]/[0.08] text-[var(--gr-lime)] ring-1 ring-[var(--gr-lime)]/20">
        <Compass className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <p className="font-display text-[16px] font-black uppercase tracking-wide text-white">
          ჯერ რეკომენდაცია არ არის
        </p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-white/45">
          დაამატე საყვარელი თამაშები პროფილში ან გამოიწერე რამდენიმე მოთამაშე —
          მალევე გაჩვენებთ ვინც შენ წრესთან ახლოსაა.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Link
          href="/search"
          className="rounded-full border border-[var(--gr-lime)]/40 bg-[var(--gr-lime)]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gr-lime)] transition-colors hover:bg-[var(--gr-lime)]/20"
        >
          მოთამაშეების ძებნა
        </Link>
        <Link
          href="/settings"
          className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:bg-white/10"
        >
          თამაშების დამატება
        </Link>
      </div>
    </div>
  );
}
