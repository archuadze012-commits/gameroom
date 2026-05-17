import type { BracketMatch } from "@/lib/tournament/generate-bracket";

export function Bracket({ matches }: { matches: BracketMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
        ბრეკეტი არ არის შექმნილი — დაელოდე ჩემპიონატის დაწყებას.
      </div>
    );
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const roundLabels: Record<number, string> = {
    1: "1/8 ფინალი",
    2: "მეოთხედფინალი",
    3: "ნახევარფინალი",
    4: "ფინალი",
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-6 pb-2">
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round);
          const totalRounds = rounds.length;
          const label =
            round === totalRounds
              ? "ფინალი"
              : round === totalRounds - 1
              ? "ნახევარფინალი"
              : round === totalRounds - 2
              ? "მეოთხედფინალი"
              : (roundLabels[round] ?? `${round}-ე რაუნდი`);

          return (
            <div key={round} className="flex min-w-[220px] flex-1 flex-col">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </div>
              <div
                className="flex flex-1 flex-col justify-around gap-3"
                style={{ minHeight: `${roundMatches.length * 80}px` }}
              >
                {roundMatches.map((m) => (
                  <MatchCard key={`${m.round}-${m.position}`} match={m} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const p1Winner = match.winner && match.player1 && match.winner.id === match.player1.id;
  const p2Winner = match.winner && match.player2 && match.winner.id === match.player2.id;

  return (
    <div className="rounded-md border border-border/60 bg-card/60 text-sm">
      <PlayerRow
        name={match.player1?.name}
        score={match.score1}
        winner={!!p1Winner}
        seed={match.player1?.seed}
      />
      <div className="h-px bg-border/60" />
      <PlayerRow
        name={match.player2?.name}
        score={match.score2}
        winner={!!p2Winner}
        seed={match.player2?.seed}
      />
    </div>
  );
}

function PlayerRow({
  name,
  score,
  winner,
  seed,
}: {
  name?: string;
  score?: number;
  winner: boolean;
  seed?: number;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        winner ? "text-primary" : ""
      } ${!name ? "text-muted-foreground/60" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {seed && (
          <span className="text-[10px] text-muted-foreground">#{seed}</span>
        )}
        <span className="truncate">{name ?? "TBD"}</span>
      </div>
      <span className={`font-mono text-xs ${winner ? "font-semibold" : ""}`}>
        {score ?? "—"}
      </span>
    </div>
  );
}
