import { z } from "zod";

export type LoadoutData = {
  combo?: string;
  character?: string;
  weapons?: string[];
  vehicle?: string;
  lobby?: string;
  effect?: string;
  nameCard?: string;
};

export const LOBBY_LOADOUT_DEFAULTS: Readonly<Required<LoadoutData>> = {
  combo: "combo_none",
  character: "leo",
  weapons: [],
  vehicle: "icefire_sedan",
  lobby: "lobby_svaneti",
  effect: "fx_none",
  nameCard: "nc_default",
};

const BASE_ALLOWED_IDS = {
  combo: [LOBBY_LOADOUT_DEFAULTS.combo],
  character: [LOBBY_LOADOUT_DEFAULTS.character],
  vehicle: [LOBBY_LOADOUT_DEFAULTS.vehicle],
  lobby: [LOBBY_LOADOUT_DEFAULTS.lobby],
  effect: [LOBBY_LOADOUT_DEFAULTS.effect, "fx_fire"],
  nameCard: [LOBBY_LOADOUT_DEFAULTS.nameCard],
} as const;

const loadoutValueSchema = z.string().trim().min(1).max(120);

const loadoutSchema = z.object({
  combo: loadoutValueSchema.optional(),
  character: loadoutValueSchema.optional(),
  weapons: z.array(loadoutValueSchema).max(4).optional(),
  vehicle: loadoutValueSchema.optional(),
  lobby: loadoutValueSchema.optional(),
  effect: loadoutValueSchema.optional(),
  nameCard: loadoutValueSchema.optional(),
});

export const lobbyGameSlugSchema = z
  .string()
  .trim()
  .min(1, "game_slug_required")
  .max(80, "game_slug_too_long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "game_slug_invalid");

type AllowedLoadoutIds = {
  comboIds?: Iterable<string>;
  characterIds?: Iterable<string>;
  weaponIds?: Iterable<string>;
  vehicleIds?: Iterable<string>;
  lobbyIds?: Iterable<string>;
  effectIds?: Iterable<string>;
  nameCardIds?: Iterable<string>;
};

function buildAllowedIds(baseIds: readonly string[], extraIds?: Iterable<string>) {
  const allowed = new Set(baseIds);
  if (!extraIds) return allowed;

  for (const rawId of extraIds) {
    if (typeof rawId !== "string") continue;
    const normalizedId = rawId.trim();
    if (normalizedId) allowed.add(normalizedId);
  }

  return allowed;
}

function pickAllowedValue(
  candidate: string | undefined,
  allowedIds: Set<string>,
  fallback: string,
) {
  if (!candidate) return fallback;
  return allowedIds.has(candidate) ? candidate : fallback;
}

export function normalizeLobbyLoadout(
  input: unknown,
  allowedIds: AllowedLoadoutIds = {},
): Required<LoadoutData> {
  const parsed = loadoutSchema.safeParse(input);
  const candidate = parsed.success ? parsed.data : {};

  const allowedCombos = buildAllowedIds(BASE_ALLOWED_IDS.combo, allowedIds.comboIds);
  const allowedCharacters = buildAllowedIds(BASE_ALLOWED_IDS.character, allowedIds.characterIds);
  const allowedWeapons = buildAllowedIds([], allowedIds.weaponIds);
  const allowedVehicles = buildAllowedIds(BASE_ALLOWED_IDS.vehicle, allowedIds.vehicleIds);
  const allowedLobbies = buildAllowedIds(BASE_ALLOWED_IDS.lobby, allowedIds.lobbyIds);
  const allowedEffects = buildAllowedIds(BASE_ALLOWED_IDS.effect, allowedIds.effectIds);
  const allowedNameCards = buildAllowedIds(BASE_ALLOWED_IDS.nameCard, allowedIds.nameCardIds);

  const legacyWeapon = (candidate as any).weapon;
  let candidateWeapons = candidate.weapons;
  if (!candidateWeapons && typeof legacyWeapon === "string") {
    candidateWeapons = [legacyWeapon];
  }

  let finalWeapons = (candidateWeapons || []).filter(w => allowedWeapons.has(w)).slice(0, 4);
  if (finalWeapons.length === 0) {
    finalWeapons = LOBBY_LOADOUT_DEFAULTS.weapons;
  }

  return {
    combo: pickAllowedValue(candidate.combo, allowedCombos, LOBBY_LOADOUT_DEFAULTS.combo),
    character: pickAllowedValue(candidate.character, allowedCharacters, LOBBY_LOADOUT_DEFAULTS.character),
    weapons: finalWeapons,
    vehicle: pickAllowedValue(candidate.vehicle, allowedVehicles, LOBBY_LOADOUT_DEFAULTS.vehicle),
    lobby: pickAllowedValue(candidate.lobby, allowedLobbies, LOBBY_LOADOUT_DEFAULTS.lobby),
    effect: pickAllowedValue(candidate.effect, allowedEffects, LOBBY_LOADOUT_DEFAULTS.effect),
    nameCard: pickAllowedValue(candidate.nameCard, allowedNameCards, LOBBY_LOADOUT_DEFAULTS.nameCard),
  };
}
