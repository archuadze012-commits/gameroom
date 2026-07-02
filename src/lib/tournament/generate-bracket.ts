export type BracketParticipant = {
  id: string;
  name: string;
  seed: number;
};

export type BracketMatch = {
  round: number; // 1-indexed
  position: number; // 1-indexed within round
  player1: BracketParticipant | null;
  player2: BracketParticipant | null;
  winner?: BracketParticipant | null;
  score1?: number;
  score2?: number;
  status?: "pending" | "ready" | "live" | "completed";
};

/**
 * Generate a single-elimination bracket from a list of seeded participants.
 *
 * Uses standard seeding so that #1 vs #N, #2 vs #N-1, etc. in round 1.
 * Pads with BYE slots up to the next power of two when participants don't fit.
 *
 * Returns matches in round-then-position order, suitable for direct rendering.
 */
export function generateSingleElimBracket(
  participants: BracketParticipant[],
): { matches: BracketMatch[]; rounds: number } {
  if (participants.length < 2) return { matches: [], rounds: 0 };

  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  const bracketSize = nextPowerOfTwo(sorted.length);
  const seedOrder = buildSeedOrder(bracketSize);
  const slots: (BracketParticipant | null)[] = seedOrder.map((seed) => {
    return sorted[seed - 1] ?? null;
  });

  const rounds = Math.log2(bracketSize);
  const matches: BracketMatch[] = [];

  // Round 1 — fill from seeded slots
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1 = slots[i * 2];
    const p2 = slots[i * 2 + 1];
    matches.push({
      round: 1,
      position: i + 1,
      player1: p1,
      player2: p2,
      // auto-advance byes
      winner: p1 && !p2 ? p1 : !p1 && p2 ? p2 : null,
      status: p1 && p2 ? "ready" : "completed",
    });
  }

  // Subsequent rounds — empty slots, filled as winners get reported
  for (let r = 2; r <= rounds; r++) {
    const matchesInRound = bracketSize / 2 ** r;
    for (let i = 0; i < matchesInRound; i++) {
      // Propagate auto-advanced byes from the prior round
      const prevA = matches.find(
        (m) => m.round === r - 1 && m.position === i * 2 + 1,
      );
      const prevB = matches.find(
        (m) => m.round === r - 1 && m.position === i * 2 + 2,
      );
      const p1 = prevA?.winner ?? null;
      const p2 = prevB?.winner ?? null;
      matches.push({
        round: r,
        position: i + 1,
        player1: p1,
        player2: p2,
        // If both feeder matches were byes, this slot is already filled and must
        // be 'ready' — otherwise nothing ever flips it and the bracket deadlocks
        // (participant counts 5, 9, 10, 11, …). A half-filled slot stays pending.
        status: p1 && p2 ? "ready" : "pending",
      });
    }
  }

  return { matches, rounds };
}

function nextPowerOfTwo(n: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(n, 2)));
}

/**
 * Standard bracket seed order — for size 8 returns [1,8,5,4,3,6,7,2].
 * Recursive doubling: at each level, the pair is (seed, sum - seed + 1).
 */
function buildSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const sum = order.length * 2 + 1;
    for (const s of order) {
      next.push(s, sum - s);
    }
    order = next;
  }
  return order;
}
