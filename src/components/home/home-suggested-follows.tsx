import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/follow-button";

// Discovery — "people you may know" for the home sidebar. Ranks candidates via
// the get_suggested_follows RPC (friends-of-friends + shared favorite games),
// so following one person keeps surfacing their circle. Shown to every signed-in
// user, not just empty-feed newcomers, so the follow graph grows continuously.
// Renders nothing when there is no signal yet, so the sidebar never shows a dead
// widget.
export async function HomeSuggestedFollows({ currentUserId }: { currentUserId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_suggested_follows", {
    p_user: currentUserId,
    p_limit: 5,
  });

  const suggestions = data ?? [];
  if (suggestions.length === 0) return null;

  return (
    <div className="pubg-loadout-link group relative block" data-variant="support">
      <div className="pubg-loadout-card relative overflow-hidden p-6">
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] bg-[var(--gr-lime)]/80" />
        <div className="relative z-[1]">
          <h3 className="mb-5 font-display text-[12px] font-black uppercase tracking-[0.2em] text-[#D0F8FF]/80">
            შესაძლოა იცნობდე
          </h3>

          <ul className="flex flex-col gap-3.5">
            {suggestions.map((u) => {
              const reason =
                u.mutual_count > 0
                  ? `${u.mutual_count} საერთო მეგობარი`
                  : u.shared_games > 0
                    ? `${u.shared_games} საერთო თამაში`
                    : "რეკომენდებული";
              return (
                <li key={u.id} className="flex items-center gap-3">
                  <Link href={`/profile/${u.username}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.avatar_url || "/default-avatar.svg"}
                      alt={u.display_name || u.username || "user"}
                      className="h-10 w-10 rounded-full border border-white/10 object-cover transition-transform hover:scale-105 hover:border-[var(--gr-lime)]/50"
                    />
                  </Link>
                  <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-white/90">
                      {u.display_name || u.username}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-[var(--gr-lime)]/70">
                      {reason}
                    </p>
                  </Link>
                  <FollowButton username={u.username} initialFollowing={false} compact />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
