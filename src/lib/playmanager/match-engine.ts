type MatchSettings = {
  tacticalStyle: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensiveLine: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focusSide: 'left' | 'center' | 'right';
};

type PlayerRow = {
  shirt_number: number | null;
  position: string | null;
  player: {
    primary_position: string | null;
    ovr_current: number | null;
    fatigue: number | null;
    morale: number | null;
    injury_matches: number | null;
    status: string | null;
    card_stats: Record<string, number | string> | null;
  } | null;
};

type Profile = {
  attack: number;
  wing: number;
  central: number;
  midfield: number;
  defense: number;
  keeper: number;
  readiness: number;
  tacticalFit: number;
};

type SimulatedMatchResult = {
  score1: number;
  score2: number;
  winnerId: string;
  profile1: Profile;
  profile2: Profile;
};

const DEFAULT_SETTINGS: MatchSettings = {
  tacticalStyle: 'balanced',
  defensiveLine: 'mid',
  tempo: 'balanced',
  focusSide: 'center',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stat(player: NonNullable<PlayerRow['player']>, label: string) {
  const raw = player.card_stats?.[label];
  const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(numeric) ? clamp(numeric, 35, 99) : clamp(player.ovr_current ?? 60, 35, 99);
}

function avg(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function effective(value: number, player: NonNullable<PlayerRow['player']>) {
  const fatiguePenalty = clamp((player.fatigue ?? 0) * 0.28, 0, 24);
  const moraleSwing = clamp(((player.morale ?? 70) - 70) * 0.12, -5, 6);
  const injuryPenalty = (player.injury_matches ?? 0) > 0 || player.status === 'injured' ? 18 : 0;
  return clamp(value - fatiguePenalty + moraleSwing - injuryPenalty, 20, 105);
}

function playerLane(row: PlayerRow) {
  const player = row.player;
  if (!player) return null;
  const pos = (row.position || player.primary_position || '').toUpperCase();
  const pac = effective(stat(player, 'PAC'), player);
  const sho = effective(stat(player, 'SHO'), player);
  const pas = effective(stat(player, 'PAS'), player);
  const dri = effective(stat(player, 'DRI'), player);
  const def = effective(stat(player, 'DEF'), player);
  const phy = effective(stat(player, 'PHY'), player);
  const gk = effective(avg(['DIV', 'HAN', 'REF', 'POS'].map((key) => stat(player, key)), player.ovr_current ?? 60), player);

  return {
    pos,
    ovr: effective(player.ovr_current ?? 60, player),
    attack: pos === 'ST' || pos === 'CF'
      ? sho * 0.42 + pac * 0.18 + dri * 0.24 + phy * 0.16
      : sho * 0.22 + pac * 0.22 + dri * 0.28 + pas * 0.28,
    wing: ['LW', 'RW', 'LM', 'RM', 'LB', 'RB'].includes(pos)
      ? pac * 0.36 + dri * 0.3 + pas * 0.18 + def * 0.16
      : pac * 0.2 + dri * 0.25 + pas * 0.25 + sho * 0.3,
    central: ['ST', 'CF', 'CAM', 'CM', 'CDM'].includes(pos)
      ? sho * 0.26 + pas * 0.25 + dri * 0.25 + phy * 0.24
      : sho * 0.18 + pas * 0.24 + dri * 0.22 + phy * 0.18 + def * 0.18,
    midfield: ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)
      ? pas * 0.34 + dri * 0.24 + def * 0.2 + phy * 0.14 + pac * 0.08
      : pas * 0.25 + dri * 0.2 + def * 0.25 + phy * 0.2 + pac * 0.1,
    defense: ['CB', 'LB', 'RB', 'CDM'].includes(pos)
      ? def * 0.42 + phy * 0.24 + pac * 0.18 + pas * 0.08 + dri * 0.08
      : def * 0.34 + phy * 0.24 + pac * 0.18 + pas * 0.12 + dri * 0.12,
    keeper: pos === 'GK' ? gk : 0,
  };
}

function tacticalProfile(profile: Profile, settings: MatchSettings) {
  const next = { ...profile };

  if (settings.tacticalStyle === 'pressing') {
    next.attack += 3;
    next.midfield += 4;
    next.defense -= 2;
    next.tacticalFit += 3;
  } else if (settings.tacticalStyle === 'possession') {
    next.midfield += 5;
    next.central += 2;
    next.defense += 1;
    next.tacticalFit += 2;
  } else if (settings.tacticalStyle === 'counter') {
    next.attack += 2;
    next.wing += 5;
    next.midfield -= 2;
    next.tacticalFit += 2;
  }

  if (settings.defensiveLine === 'high') {
    next.attack += 2;
    next.midfield += 2;
    next.defense -= 4;
  } else if (settings.defensiveLine === 'low') {
    next.defense += 5;
    next.attack -= 2;
  }

  if (settings.tempo === 'direct') {
    next.attack += 3;
    next.wing += 2;
    next.midfield -= 2;
  } else if (settings.tempo === 'controlled') {
    next.midfield += 3;
    next.defense += 2;
    next.attack -= 1;
  }

  if (settings.focusSide === 'center') next.central += 3;
  if (settings.focusSide === 'left' || settings.focusSide === 'right') next.wing += 3;

  return next;
}

export function buildMatchProfile(rows: PlayerRow[], settings: Partial<MatchSettings> = {}): Profile {
  const starters = rows
    .filter((row) => (row.shirt_number ?? 99) <= 11)
    .map(playerLane)
    .filter((row): row is NonNullable<ReturnType<typeof playerLane>> => row !== null);

  const outfield = starters.filter((player) => player.pos !== 'GK');
  const defenders = outfield.filter((player) => ['CB', 'LB', 'RB', 'CDM'].includes(player.pos));
  const attackers = outfield.filter((player) => ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(player.pos));
  const midfielders = outfield.filter((player) => ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(player.pos));
  const keeper = starters.find((player) => player.pos === 'GK');
  const raw: Profile = {
    attack: avg(attackers.map((player) => player.attack), avg(outfield.map((player) => player.attack), 60)),
    wing: avg(outfield.map((player) => player.wing), 60),
    central: avg(outfield.map((player) => player.central), 60),
    midfield: avg(midfielders.map((player) => player.midfield), avg(outfield.map((player) => player.midfield), 60)),
    defense: avg(defenders.map((player) => player.defense), avg(outfield.map((player) => player.defense), 60)),
    keeper: keeper?.keeper ?? avg(starters.map((player) => player.ovr), 60),
    readiness: clamp(avg(starters.map((player) => player.ovr), 60), 35, 100),
    tacticalFit: 0,
  };

  return tacticalProfile(raw, { ...DEFAULT_SETTINGS, ...settings });
}

function scoreFromXg(xg: number) {
  const roll = Math.random();
  const noise = (Math.random() - 0.5) * 0.8;
  const value = xg + noise + (roll > 0.88 ? 0.7 : 0) - (roll < 0.12 ? 0.5 : 0);
  return Math.round(clamp(value, 0, 5));
}

export function simulateMatch(team1Id: string, team1: Profile, team2Id: string, team2: Profile): SimulatedMatchResult {
  const team1Chance =
    0.9
    + ((team1.attack + team1.central + team1.wing) / 3 - ((team2.defense * 0.72) + (team2.keeper * 0.28))) / 22
    + (team1.midfield - team2.midfield) / 55
    + (team1.readiness - team2.readiness) / 80
    + team1.tacticalFit / 28;
  const team2Chance =
    0.9
    + ((team2.attack + team2.central + team2.wing) / 3 - ((team1.defense * 0.72) + (team1.keeper * 0.28))) / 22
    + (team2.midfield - team1.midfield) / 55
    + (team2.readiness - team1.readiness) / 80
    + team2.tacticalFit / 28;

  let score1 = scoreFromXg(clamp(team1Chance, 0.15, 3.8));
  let score2 = scoreFromXg(clamp(team2Chance, 0.15, 3.8));
  if (score1 === score2) {
    const edge = (team1.attack + team1.midfield + team1.defense + team1.keeper) - (team2.attack + team2.midfield + team2.defense + team2.keeper);
    if (Math.abs(edge) > 8 || Math.random() > 0.45) {
      if (edge >= 0) score1 += 1;
      else score2 += 1;
    }
  }

  return {
    score1,
    score2,
    winnerId: score1 >= score2 ? team1Id : team2Id,
    profile1: team1,
    profile2: team2,
  };
}
