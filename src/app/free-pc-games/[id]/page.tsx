import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Monitor, Cpu, MemoryStick, HardDrive, Gamepad2, Smartphone, Pencil } from "lucide-react";
import { crackedGames, type CrackedGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DownloadButton } from "./download-button";
import { AdminUrlEditor } from "./admin-url-editor";
import { AdminDeleteButton } from "./delete-button";
import { YouTubeEmbed } from "@/components/youtube-embed";

function getObjectPosition(url?: string) {
  if (!url) return "center";
  try {
    const parsed = new URL(url, url.startsWith("/") ? "https://example.com" : undefined);
    const y = parsed.searchParams.get("y");
    if (y) return `center ${y}%`;
  } catch {}
  return "center";
}

type DbRow = {
  id: string;
  title: string;
  emoji: string;
  cover_url: string | null;
  release_year: number;
  rating: number;
  description: string;
  download_url: string;
  gameplay_url: string | null;
  accent: string;
  genres: string[];
  platforms: string[];
  trending: boolean;
  system_reqs: { min: { os: string; cpu: string; ram: string; gpu: string; storage: string }; rec: { os: string; cpu: string; ram: string; gpu: string; storage: string } };
  metacritic_score: number | null;
};

function dbRowToGame(row: DbRow): CrackedGame {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    coverUrl: row.cover_url ?? undefined,
    releaseYear: row.release_year,
    rating: row.rating,
    description: row.description,
    downloadUrl: row.download_url,
    gameplayUrl: row.gameplay_url ?? undefined,
    accent: row.accent,
    genre: row.genres,
    platform: row.platforms,
    trending: row.trending,
    systemReqs: row.system_reqs,
    metacriticScore: row.metacritic_score ?? undefined,
  };
}

export default async function CrackedGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let game: CrackedGame | undefined;
  const supabase = await createSupabaseServerClient();
  const [{ data: dbRow }, { data: { user } }] = await Promise.all([
    supabase.from("cracked_games").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (dbRow) {
    game = dbRowToGame(dbRow as unknown as DbRow);
  } else {
    game = crackedGames.find((g) => g.id === id);
  }
  if (!game) notFound();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin" || profile?.role === "moderator";
  }

  const PLATFORM_ICON: Record<string, React.ReactNode> = {
    PC: <Monitor className="h-3 w-3" />,
    Mobile: <Smartphone className="h-3 w-3" />,
    PS5: <Gamepad2 className="h-3 w-3" />,
    PS4: <Gamepad2 className="h-3 w-3" />,
    Xbox: <Gamepad2 className="h-3 w-3" />,
    Switch: <Gamepad2 className="h-3 w-3" />,
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      {/* Dot grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-4xl px-4 py-8 space-y-8">
        <Link
          href="/free-pc-games"
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--gr-magenta)] hover:text-white hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> უკან დაბრუნება
        </Link>

        {/* Hero */}
        <div className="pubg-loadout-link group relative block" data-variant="royale">
          <div className="pubg-loadout-card overflow-hidden !p-0">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] z-[5]" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-24 w-24 opacity-30 z-0" />
            <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3 z-0" />

            <div className="relative z-[1] w-full aspect-[21/9] sm:aspect-[21/7] overflow-hidden border-b border-white/[0.07]">
              {game.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={game.coverUrl} alt={game.title} className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity" style={{ objectPosition: getObjectPosition(game.coverUrl) }} />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${game.accent} opacity-20`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-1)]/40 to-transparent" />
              
              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4 z-10">
                <div className="space-y-2">
                  <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--gr-text)] drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                    {game.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-[var(--gr-text-mute)]">
                    <span className="text-[12px] font-bold uppercase tracking-wider">{game.releaseYear}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1 text-[var(--gr-amber)] bg-[var(--gr-amber)]/10 px-2 py-0.5 rounded-full border border-[var(--gr-amber)]/20 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                      <Star className="h-3.5 w-3.5 fill-[var(--gr-amber)]" />
                      <span className="font-bold">{game.rating}</span>
                    </span>
                    {game.metacriticScore != null && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                          <span className={`inline-flex items-center justify-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-black text-white ${
                            game.metacriticScore >= 75 ? "bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]" :
                            game.metacriticScore >= 50 ? "bg-yellow-600 shadow-[0_0_8px_rgba(202,138,4,0.5)]" : "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
                          }`}>
                            {game.metacriticScore}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gr-text-dim)]">Metacritic</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <Link
                        href={`/admin/free-pc-games?edit=${game.id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--gr-amber)]/40 bg-[var(--gr-amber)]/10 text-[var(--gr-amber)] transition-colors hover:bg-[var(--gr-amber)]/20 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        title="ადმინ რედაქტირება"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <AdminDeleteButton gameId={game.id} />
                    </>
                  )}
                  <DownloadButton gameId={game.id} fallbackUrl={game.downloadUrl} />
                </div>
              </div>
            </div>

            <div className="relative z-[2] p-6 border-t border-white/[0.07]">
              <div className="flex flex-wrap gap-2">
                {game.genre.map((g) => (
                  <span key={g} className="text-[10px] font-black uppercase tracking-wider text-[#D0F8FF] bg-[#D0F8FF]/10 px-2.5 py-1 rounded-full border border-[#D0F8FF]/20 shadow-[0_0_10px_rgba(0,230,255,0.15)]">
                    {g}
                  </span>
                ))}
                {game.platform.map((p) => (
                  <span key={p} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gr-cyan-glow)] bg-[var(--gr-cyan-glow)]/10 px-2.5 py-1 rounded-full border border-[var(--gr-cyan-glow)]/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                    {PLATFORM_ICON[p]} {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gameplay video */}
        {game.gameplayUrl && (
          <div className="pubg-loadout-link group relative block" data-variant="room">
            <div className="pubg-loadout-card p-6 space-y-4">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] z-[5]" />
              
              <div className="relative z-[1]">
                <h2 className="font-display text-[14px] font-black uppercase tracking-[0.2em] text-[var(--gr-text)] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--gr-magenta)] shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                  გეიმფლეი ვიდეო
                </h2>
                <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.07] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <YouTubeEmbed url={game.gameplayUrl} title={`${game.title} gameplay`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="pubg-loadout-link group relative block" data-variant="strike">
          <div className="pubg-loadout-card p-6 space-y-4">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] z-[5]" />
            
            <div className="relative z-[1]">
              <h2 className="font-display text-[14px] font-black uppercase tracking-[0.2em] text-[var(--gr-text)] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--gr-cyan-glow)] shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                აღწერა
              </h2>
              <p className="mt-4 leading-relaxed text-[15px] font-medium text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.4)] whitespace-pre-line">{game.description}</p>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="pubg-loadout-link group relative block" data-variant="strike">
          <div className="pubg-loadout-card p-6 space-y-5">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] z-[5]" />
            
            <div className="relative z-[1]">
              <h2 className="font-display text-[14px] font-black uppercase tracking-[0.2em] text-[var(--gr-text)] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--gr-violet-hi)] shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                სისტემური მოთხოვნილებები
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ReqColumn label="მინიმალური" reqs={game.systemReqs.min} />
                <ReqColumn label="რეკომენდებული" reqs={game.systemReqs.rec} highlight />
              </div>
            </div>
          </div>
        </div>

        {/* Admin URL editor */}
        <AdminUrlEditor gameId={game.id} />

        {/* Download CTA */}
        <div className="pubg-loadout-link group relative block" data-variant="royale">
          <div className="pubg-loadout-card overflow-hidden">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px] z-[5]" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-30 z-0" />
            <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3 z-0" />
            
            <div className="relative z-[1] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(236,72,153,0.1),rgba(139,92,246,0.1))]" />
              <div className="relative z-[2] text-center sm:text-left space-y-1">
                <p className="font-display text-xl font-black uppercase tracking-wide text-[var(--gr-text)] drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                  მზად ხარ სათამაშოდ?
                </p>
                <p className="text-[13px] font-bold text-[var(--gr-text-mute)]">
                  გადმოწერე <span className="text-[var(--gr-magenta)]">{game.title}</span> და დაიწყე ახლავე.
                </p>
              </div>
              <div className="relative z-[2] shrink-0">
                <DownloadButton gameId={game.id} fallbackUrl={game.downloadUrl} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReqColumn({
  label,
  reqs,
  highlight = false,
}: {
  label: string;
  reqs: { os: string; cpu: string; ram: string; gpu: string; storage: string };
  highlight?: boolean;
}) {
  const rows = [
    { icon: <Monitor className="h-3.5 w-3.5" />, label: "OS", value: reqs.os },
    { icon: <Cpu className="h-3.5 w-3.5" />, label: "CPU", value: reqs.cpu },
    { icon: <MemoryStick className="h-3.5 w-3.5" />, label: "RAM", value: reqs.ram },
    { icon: <Monitor className="h-3.5 w-3.5" />, label: "GPU", value: reqs.gpu },
    { icon: <HardDrive className="h-3.5 w-3.5" />, label: "Storage", value: reqs.storage },
  ];

  return (
    <div className={`rounded-xl border p-5 space-y-4 relative overflow-hidden ${highlight ? "border-[var(--gr-magenta)]/30 bg-[var(--gr-magenta)]/5 shadow-[0_0_15px_rgba(236,72,153,0.05)]" : "border-white/[0.07] bg-white/[0.02]"}`}>
      {highlight && <span className="absolute inset-y-0 left-0 w-1 bg-[var(--gr-magenta)]" />}
      <p className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${highlight ? "text-[var(--gr-magenta)] drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" : "text-[var(--gr-text-dim)]"}`}>
        {highlight && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gr-magenta)]" />}
        {label}
      </p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--gr-text-dim)] mb-1">
              {row.icon} {row.label}
            </div>
            <p className="text-[13px] font-medium text-[var(--gr-text)] pl-5.5">{row.value}</p>
            {i !== rows.length - 1 && <div className="mt-3 h-px bg-white/[0.07] w-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}

