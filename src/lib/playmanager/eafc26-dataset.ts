import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsePlayerCardStats, type PlayerCardStatsInput } from './player-card-stats';

export type Eafc26DatasetPlayer = {
  normalized_name: string;
  display_name: string;
  position: string;
  age: number;
  overall: number;
  value: number;
  stats: PlayerCardStatsInput;
  player_face_url?: string | null;
};

let cachedDataset: Eafc26DatasetPlayer[] | null = null;
let cachedByName: Map<string, Eafc26DatasetPlayer> | null = null;

export async function loadEafc26Dataset() {
  if (cachedDataset) return cachedDataset;
  const datasetPath = path.join(process.cwd(), 'public', 'playmanager', 'data', 'eafc26-all-players.json');
  const raw = await fs.readFile(datasetPath, 'utf8');
  cachedDataset = JSON.parse(raw) as Eafc26DatasetPlayer[];
  return cachedDataset;
}

async function getEafc26DatasetByName() {
  if (cachedByName) return cachedByName;
  const dataset = await loadEafc26Dataset();
  cachedByName = new Map(dataset.map((player) => [player.normalized_name, player]));
  return cachedByName;
}

export async function getEafc26PlayerFaceUrl(normalizedName: string | null | undefined) {
  const key = normalizedName?.trim();
  if (!key) return null;
  const datasetByName = await getEafc26DatasetByName();
  return datasetByName.get(key)?.player_face_url?.trim() || null;
}

async function getEafc26PlayerStats(normalizedName: string | null | undefined) {
  const key = normalizedName?.trim();
  if (!key) return null;
  const datasetByName = await getEafc26DatasetByName();
  return datasetByName.get(key)?.stats ?? null;
}

function statsDiffer(left: PlayerCardStatsInput, right: PlayerCardStatsInput) {
  const keys = new Set([
    ...Object.keys(left ?? {}),
    ...Object.keys(right ?? {}),
  ]);

  for (const key of keys) {
    const leftValue = left?.[key as keyof NonNullable<PlayerCardStatsInput>];
    const rightValue = right?.[key as keyof NonNullable<PlayerCardStatsInput>];
    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      if (Number(leftValue ?? NaN) !== Number(rightValue ?? NaN)) return true;
    }
  }

  return false;
}

export async function resolveRealPlayerStats(
  normalizedName: string | null | undefined,
  dbStats: PlayerCardStatsInput,
) {
  const parsedDbStats = parsePlayerCardStats(dbStats);
  const officialStats = await getEafc26PlayerStats(normalizedName);
  if (!officialStats) return parsedDbStats ?? null;
  if (parsedDbStats && statsDiffer(parsedDbStats, officialStats)) return parsedDbStats;
  return officialStats;
}
