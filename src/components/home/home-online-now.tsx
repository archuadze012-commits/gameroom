import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { onlineCutoffIso } from "@/lib/presence";

// Live "who's online right now" strip for the home sidebar. Presence comes from
// last_seen_at (refreshed via /api/me on each visit). Renders nothing when the
// viewer is the only one around, so the sidebar never shows a dead widget.
export async function HomeOnlineNow({ currentUserId }: { currentUserId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("banned", false)
    .neq("id", currentUserId)
    .not("avatar_url", "is", null)
    .gt("last_seen_at", onlineCutoffIso())
    .order("last_seen_at", { ascending: false })
    .limit(14);

  const online = data ?? [];
  if (online.length === 0) return null;

  return (
    <div className="pubg-loadout-link group relative block" data-variant="support">
      <div className="pubg-loadout-card relative overflow-hidden p-6">
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] bg-[var(--gr-lime)]/80" />
        <div className="relative z-[1]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] text-[#D0F8FF]/80">
              ონლაინ ახლა
            </h3>
            <span className="flex items-center gap-1.5 text-[11px] font-black text-[var(--gr-lime)]">
              <span className="relative grid h-2 w-2 place-items-center">
                <span className="absolute inset-0 rounded-full bg-[var(--gr-lime)] opacity-60 motion-safe:animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--gr-lime)]" />
              </span>
              {online.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {online.map((u) => (
              <Link
                key={u.username}
                href={`/profile/${u.username}`}
                title={u.display_name || u.username || undefined}
                className="relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.avatar_url || "/default-avatar.svg"}
                  alt={u.display_name || u.username || "user"}
                  className="h-10 w-10 rounded-full border border-white/10 object-cover transition-transform hover:scale-110 hover:border-[var(--gr-lime)]/50"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--gr-lime)] shadow-[0_0_6px_var(--gr-lime)] ring-2 ring-[var(--gr-bg-1)]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
