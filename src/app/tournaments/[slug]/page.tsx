import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Users, Calendar, ListChecks, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateSingleElimBracket } from "@/lib/tournament/generate-bracket";
import { Bracket } from "@/components/tournament/bracket";
import { MatchSummary } from "@/components/tournament/match-summary";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { format } from "date-fns";
import { TournamentActions } from "./tournament-actions";

export const dynamic = "force-dynamic";

const mapStatus = (s: string): "pending" | "ready" | "live" | "completed" => {
  if (["confirmed", "reported", "disputed"].includes(s)) return "completed";
  if (s === "live") return "live";
  if (s === "ready") return "ready";
  return "pending";
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSession().catch(() => null);

  // Fetch tournament details
  const { data: t } = await supabase
    .from("tournaments")
    .select(`
      id,
      name,
      slug,
      description,
      banner_url,
      format,
      max_participants,
      prize_pool,
      starts_at,
      status,
      games:game_id (
        slug,
        name_ka,
        emoji
      )
    `)
    .eq("slug", slug)
    .single();

  if (!t) notFound();
  const game = Array.isArray(t.games) ? t.games[0] : (t.games as any);

  // Fetch participants
  const { data: dbParticipants } = await supabase
    .from("tournament_participants")
    .select(`
      id,
      seed,
      team_name,
      checked_in,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("tournament_id", t.id)
    .order("seed", { ascending: true });

  const participants = (dbParticipants || []).map((p: any) => ({
    id: p.profiles?.id || p.id,
    name: p.profiles?.username || p.team_name || "Participant",
    displayName: p.profiles?.display_name || p.profiles?.username || p.team_name || "Participant",
    seed: p.seed || 1,
    checkedIn: p.checked_in,
  }));

  const isRegistered = sessionUser
    ? (dbParticipants || []).some((p: any) => p.profiles?.id === sessionUser.id)
    : false;

  const isCheckedIn = sessionUser
    ? (dbParticipants || []).some((p: any) => p.profiles?.id === sessionUser.id && p.checked_in)
    : false;

  // Fetch or generate bracket matches
  let matches: any[] = [];
  let activeMatch: any = null;

  if (t.status === "live" || t.status === "completed") {
    const { data: dbMatches } = await supabase
      .from("tournament_matches")
      .select(`
        id,
        round,
        position,
        player1_id,
        player2_id,
        score1,
        score2,
        winner_id,
        status
      `)
      .eq("tournament_id", t.id)
      .order("round", { ascending: true })
      .order("position", { ascending: true });

    matches = (dbMatches || []).map((m: any) => {
      const p1 = participants.find((p) => p.id === m.player1_id) || null;
      const p2 = participants.find((p) => p.id === m.player2_id) || null;
      const winner = participants.find((p) => p.id === m.winner_id) || null;
      
      const mapped = {
        id: m.id,
        round: m.round,
        position: m.position,
        player1: p1 ? { id: p1.id, name: p1.name, seed: p1.seed } : null,
        player2: p2 ? { id: p2.id, name: p2.name, seed: p2.seed } : null,
        winner: winner ? { id: winner.id, name: winner.name, seed: winner.seed } : null,
        score1: m.score1 ?? undefined,
        score2: m.score2 ?? undefined,
        status: mapStatus(m.status),
      };

      // Find active match for current user
      if (
        t.status === "live" &&
        mapped.status === "live" &&
        sessionUser &&
        (m.player1_id === sessionUser.id || m.player2_id === sessionUser.id)
      ) {
        activeMatch = mapped;
      }

      return mapped;
    });
  }

  // Fallback to preview generation if no live matches yet
  if (matches.length === 0 && participants.length >= 2) {
    const pForBracket = participants.map((p) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
    }));
    matches = generateSingleElimBracket(pForBracket).matches;
  }

  const formatLabels: Record<string, string> = {
    single_elim: "Single Elimination",
    double_elim: "Double Elimination",
    round_robin: "Round Robin",
  };

  const formattedDate = t.starts_at ? format(new Date(t.starts_at), "yyyy-MM-dd HH:mm") : "გამოცხადდება";
  const coverBanner = t.banner_url || "from-violet-500/40 via-primary/20 to-transparent";

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/tournaments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ყველა ჩემპიონატი
      </Link>

      <div className={`mb-6 h-40 rounded-xl bg-gradient-to-br ${coverBanner} md:h-56`} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{game?.emoji}</span>
            <span>{game?.name_ka}</span>
            <span>·</span>
            <span>{formatLabels[t.format] || t.format}</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold">{t.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary" /> {t.prize_pool || "0 GEL"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              {participants.length}/{t.max_participants || 8}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> {formattedDate}
            </span>
          </div>
        </div>
        <TournamentActions
          tournamentId={t.id}
          tournamentSlug={t.slug}
          status={t.status}
          isRegistered={isRegistered}
          isCheckedIn={isCheckedIn}
          currentUser={sessionUser}
          activeMatch={activeMatch}
        />
      </div>

      <Tabs defaultValue="bracket" className="mt-10">
        <TabsList>
          <TabsTrigger value="bracket">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" /> ბრეკეტი
          </TabsTrigger>
          <TabsTrigger value="participants">
            <Users className="mr-1.5 h-3.5 w-3.5" /> მონაწილეები
          </TabsTrigger>
          <TabsTrigger value="rules">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" /> წესები
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="mt-6 space-y-4">
          {matches.length > 0 ? (
            <Bracket matches={matches} />
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              ბრეკეტი გამოჩნდება ტურნირის დაწყებისთანავე.
            </div>
          )}
          {(t.status === "completed" || t.status === "live") && matches.length > 0 && (
            <MatchSummary
              tournamentName={t.name}
              game={game?.name_ka ?? t.slug}
              matches={matches}
            />
          )}
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          {participants.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {participants.map((p) => (
                <Card key={p.id} className="border-border/60">
                  <CardContent className="flex items-center gap-3 p-3">
                    <Badge variant="outline" className="text-[10px]">#{p.seed}</Badge>
                    <Link
                      href={`/profile/${p.name}`}
                      className="text-sm hover:text-primary"
                    >
                      @{p.name}
                    </Link>
                    {p.checkedIn && (
                      <span className="ml-auto text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
                        Checked-in
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              ჯერჯერობით არავინ დარეგისტრირებულა.
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card className="border-border/60">
            <CardContent className="space-y-3 p-6 text-sm">
              <h3 className="font-semibold">ფორმატი</h3>
              <p className="text-muted-foreground">
                {formatLabels[t.format] || t.format} — ტურნირის წესები და ბადე.
              </p>
              <h3 className="font-semibold">მატჩის წესები</h3>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Best of 3 — პირველი 2 გამარჯვებამდე.</li>
                <li>Check-in დროულად, წინააღმდეგ შემთხვევაში — DQ.</li>
                <li>დავის შემთხვევაში — admin-ის გადაწყვეტილება საბოლოოა.</li>
              </ul>
              <h3 className="font-semibold">ჯილდოს ფონდი</h3>
              <p className="text-muted-foreground">
                {t.prize_pool || "0 GEL"} — ჯილდო გადაეცემა გამარჯვებულებს ტურნირის დასრულებისთანავე.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
