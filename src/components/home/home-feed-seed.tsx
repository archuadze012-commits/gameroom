import Link from "next/link";
import { UserPlus, Users, Radar, ArrowRight, MapPin } from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import type { FeedSeed } from "@/lib/home/feed-seed";

/**
 * Rendered in place of the empty-feed placeholder. Two seed cards — "who to
 * follow" and "open LFG" — turn a dead first-run feed into something that
 * bootstraps the follow graph and the core action. Presentational; the only
 * interactive piece is the (client) FollowButton.
 */
export function HomeFeedSeed({ suggestedUsers, lfgPosts }: FeedSeed) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1 text-[13px] font-black uppercase tracking-[0.14em] text-white/50">
        <Radar className="h-4 w-4 text-[var(--gr-cyan-glow)]" /> შენი ფიდი ცოცხლდება
      </div>

      {/* Who to follow */}
      {suggestedUsers.length > 0 && (
        <div className="pubg-loadout-link block" data-variant="strike">
          <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-cyan-glow)]/80" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-20 z-[5]" />

            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[14px] font-black text-white">
                  <UserPlus className="h-4 w-4 text-[var(--gr-cyan-glow)]" /> ვის მიჰყვე
                </div>
                <Link href="/search" className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white/45 transition-colors hover:text-white/80">
                  მეტი <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <ul className="space-y-2.5">
                {suggestedUsers.map((u) => (
                  <li key={u.username} className="flex items-center gap-3">
                    <Link href={`/profile/${u.username}`} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.avatarUrl || "/default-avatar.svg"}
                        alt={u.displayName}
                        className="h-11 w-11 rounded-full border border-white/10 object-cover"
                      />
                    </Link>
                    <Link href={`/profile/${u.username}`} className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-black text-white hover:text-[#D0F8FF]">{u.displayName}</p>
                      <p className="truncate text-[11px] font-bold uppercase tracking-wider text-white/40">
                        @{u.username} · LVL {u.level}
                      </p>
                    </Link>
                    <div className="shrink-0">
                      <FollowButton username={u.username} initialFollowing={false} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Open LFG */}
      {lfgPosts.length > 0 && (
        <div className="pubg-loadout-link block" data-variant="royale">
          <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-pink-500/80" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-20 z-[5]" />

            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[14px] font-black text-white">
                  <Users className="h-4 w-4 text-pink-400" /> ვინ ეძებს გუნდს
                </div>
                <Link href="/lfg" className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white/45 transition-colors hover:text-white/80">
                  ყველა <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <ul className="space-y-2">
                {lfgPosts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/lfg/${p.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-pink-500/25 hover:bg-pink-500/[0.06]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.authorAvatar || "/default-avatar.svg"}
                        alt={p.authorName}
                        className="h-9 w-9 rounded-full border border-white/10 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-white/90">{p.title}</p>
                        <p className="flex items-center gap-2 truncate text-[11px] font-bold text-white/45">
                          {p.gameName && <span className="text-[var(--gr-cyan-glow)]">{p.gameName}</span>}
                          {p.region && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" /> {p.region}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-black tabular-nums text-white/70">
                        {p.slotsFilled}/{p.slotsTotal}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
