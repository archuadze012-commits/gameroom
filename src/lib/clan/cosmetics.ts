// Cosmetics display helpers. The catalog (keys/costs) lives in the DB table
// `clan_cosmetic_catalog`; this maps the equipped ACCENT token (clans.accent_color,
// e.g. "amber") to concrete colors for the card/hero/OG. Emblem (clans.emblem) is
// stored as the emoji directly, so it needs no mapping.

export type AccentDef = { label: string; hex: string; hex2: string };

export const ACCENTS: Record<string, AccentDef> = {
  amber: { label: "ამბერი", hex: "#f59e0b", hex2: "#f97316" },
  cyan: { label: "ციანი", hex: "#22d3ee", hex2: "#0ea5e9" },
  lime: { label: "ლაიმი", hex: "#a3e635", hex2: "#65a30d" },
  magenta: { label: "მაგენტა", hex: "#ec4899", hex2: "#d946ef" },
  crimson: { label: "ალისფერი", hex: "#ef4444", hex2: "#b91c1c" },
};

export function accentDef(token: string | null | undefined): AccentDef | null {
  return token ? (ACCENTS[token] ?? null) : null;
}

// Default (unequipped) clan look = indigo/violet.
export const DEFAULT_ACCENT: AccentDef = { label: "ინდიგო", hex: "#6366f1", hex2: "#a855f7" };

export function accentOrDefault(token: string | null | undefined): AccentDef {
  return accentDef(token) ?? DEFAULT_ACCENT;
}
