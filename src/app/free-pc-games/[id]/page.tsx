import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Monitor, Cpu, MemoryStick, HardDrive, Gamepad2, Smartphone, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { crackedGames, type CrackedGame } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DownloadButton } from "./download-button";
import { AdminUrlEditor } from "./admin-url-editor";
import { AdminDeleteButton } from "./delete-button";
import { YouTubeEmbed } from "@/components/youtube-embed";

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

  // try DB first, then fall back to mock
  let game: CrackedGame | undefined;
  const supabase = await createSupabaseServerClient();
  const [{ data: dbRow }, { data: { user } }] = await Promise.all([
    supabase.from("cracked_games").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (dbRow) {
    game = dbRowToGame(dbRow as DbRow);
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
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Link
        href="/free-pc-games"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> თამაშები
      </Link>

      {/* Hero */}
      <Card className="overflow-hidden border-border/60">
        {/* Cover banner */}
        {game.coverUrl ? (
          <div className="relative h-48 w-full overflow-hidden sm:h-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.coverUrl} alt={game.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          </div>
        ) : (
          <div className={`h-32 w-full bg-gradient-to-br ${game.accent}`} />
        )}

        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{game.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                <span>{game.releaseYear}</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span className="font-bold">{game.rating}</span>
                </span>
                {game.metacriticScore != null && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded px-1.5 text-xs font-bold text-white ${
                        game.metacriticScore >= 75 ? "bg-green-600" :
                        game.metacriticScore >= 50 ? "bg-yellow-600" : "bg-red-600"
                      }`}>
                        {game.metacriticScore}
                      </span>
                      <span className="text-xs text-muted-foreground">Metacritic</span>
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
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20"
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

          <div className="flex flex-wrap gap-2">
            {game.genre.map((g) => (
              <Badge key={g} variant="secondary">{g}</Badge>
            ))}
            {game.platform.map((p) => (
              <Badge key={p} variant="outline" className="flex items-center gap-1 border-border/60">
                {PLATFORM_ICON[p]} {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gameplay video */}
      {game.gameplayUrl && (
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              გეიმფლეი ვიდეო
            </h2>
            <YouTubeEmbed url={game.gameplayUrl} title={`${game.title} gameplay`} />
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">აღწერა</h2>
          <p className="leading-relaxed text-sm">{game.description}</p>
        </CardContent>
      </Card>

      {/* System Requirements */}
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">სისტემური მოთხოვნილებები</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ReqColumn label="მინიმალური" reqs={game.systemReqs.min} />
            <ReqColumn label="რეკომენდებული" reqs={game.systemReqs.rec} highlight />
          </div>
        </CardContent>
      </Card>

      {/* Admin URL editor */}
      <AdminUrlEditor gameId={game.id} />

      {/* Download CTA */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">მზად ხარ სათამაშოდ?</p>
            <p className="text-sm text-muted-foreground">გადმოწერე {game.title} და დაიწყე ახლავე.</p>
          </div>
          <DownloadButton gameId={game.id} fallbackUrl={game.downloadUrl} />
        </CardContent>
      </Card>
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
    <div className={`rounded-lg border p-4 space-y-3 ${highlight ? "border-primary/30 bg-primary/5" : "border-border/60 bg-secondary/20"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${highlight ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              {row.icon} {row.label}
            </div>
            <p className="text-xs font-medium pl-5">{row.value}</p>
            <Separator className="mt-2 border-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
