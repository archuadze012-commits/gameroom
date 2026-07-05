import { getTalentClass } from './talent';

const PLAYMANAGER_CURRENCY = '₾';
export const STARTING_TEAM_BALANCE_GEL = 1_000_000;

export const EA_FC_TOP_OVR = 91;
export const TOP_OVR_BASE_TRANSFER_VALUE_GEL = 100_000_000;
export const MAX_TRANSFER_VALUE_GEL = 150_000_000;
export const TRANSFER_VALUE_PER_OVR_GAIN_GEL = 2_000_000;
export const MIN_TICKET_PRICE_GEL = 10;
export const MAX_TICKET_PRICE_GEL = 80;

const MIN_OVR = 40;
const MIN_BASE_TRANSFER_VALUE_GEL = 100_000;
const VALUE_ROUNDING_GEL = 50_000;
const REFERENCE_TICKET_PRICE_GEL = 28;

// Attendance Percentage Constants
const BASE_ATTENDANCE_PCT = 0.763;
const MIN_MATCHDAY_ATTENDANCE_PCT = 0.40;
const TICKET_PRICE_STEP_PCT = 0.0115;
const LOW_PRICE_BOOST_PCT = 0.10;
const HIGH_PRICE_PENALTY_PCT = -0.155;
const FORM_WEIGHT_PCT = 0.00093;
const READINESS_WEIGHT_PCT = 0.00044;

const CASH_ROUNDING_GEL = 500;

// Stadium: 5 tiers, 22k → 100k. MUST mirror DB pm_stadium_capacity /
// pm_stadium_upgrade_cost (migration 20260703_playmanager_stadium.sql).
export const STADIUM_MAX_LEVEL = 5;

const STADIUM_CAPACITY: Record<number, number> = {
  1: 22_000,
  2: 38_000,
  3: 55_000,
  4: 75_000,
  5: 100_000,
};

export function getStadiumCapacity(level: number): number {
  const lvl = clamp(Math.trunc(level), 1, STADIUM_MAX_LEVEL);
  return STADIUM_CAPACITY[lvl] ?? STADIUM_CAPACITY[1];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

function normalizeCurrencyValue(value: number) {
  return clamp(
    roundToNearest(Math.max(0, Math.trunc(value)), VALUE_ROUNDING_GEL),
    MIN_BASE_TRANSFER_VALUE_GEL,
    MAX_TRANSFER_VALUE_GEL,
  );
}

export function getBaseTransferValueGel(ovr: number): number {
  const safeOvr = clamp(Math.trunc(ovr), MIN_OVR, EA_FC_TOP_OVR);
  const progress = (safeOvr - MIN_OVR) / (EA_FC_TOP_OVR - MIN_OVR);
  const value =
    MIN_BASE_TRANSFER_VALUE_GEL +
    (TOP_OVR_BASE_TRANSFER_VALUE_GEL - MIN_BASE_TRANSFER_VALUE_GEL) *
      Math.pow(progress, 5);

  return clamp(normalizeCurrencyValue(value), MIN_BASE_TRANSFER_VALUE_GEL, TOP_OVR_BASE_TRANSFER_VALUE_GEL);
}

export function getCurrentTransferValueGel(
  baseOvr: number,
  currentOvr: number,
): number {
  const baseValue = getBaseTransferValueGel(baseOvr);
  const ovrGain = clamp(Math.trunc(currentOvr) - Math.trunc(baseOvr), 0, 25);
  return Math.min(
    baseValue + ovrGain * TRANSFER_VALUE_PER_OVR_GAIN_GEL,
    MAX_TRANSFER_VALUE_GEL,
  );
}

// Transfer value carries a class-ceiling premium: the higher the talent class, the
// more a buyer pays for the player's potential. pro/star sit at base (×1.0) and the
// premium ramps up to legend (×1.35). rising_star keeps the historical ×1.202.
export function getTalentClassAdjustedTransferValueGel(value: number, talent: number): number {
  return normalizeCurrencyValue(value * getTalentClass(talent).valueMultiplier);
}

// Deterministic thousands-grouping with a non-breaking space (U+00A0) between
// digit groups — a plain space lets the browser wrap mid-number ("1 000 000")
// inside narrow containers (2-up mobile cards), which reads as broken text.
// Intentionally NOT toLocaleString('ka-GE'): its grouping separator differs
// between Node's server ICU and the browser's, which triggers SSR hydration
// mismatches. This regex output is byte-identical on both sides.
export function formatCount(amount: number): string {
  const NBSP = String.fromCharCode(160);
  return Math.trunc(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatGel(amount: number): string {
  const NBSP = String.fromCharCode(160);
  return `${formatCount(amount)}${NBSP}${PLAYMANAGER_CURRENCY}`;
}

export function clampTicketPriceGel(ticketPrice: number): number {
  return clamp(Math.trunc(ticketPrice), MIN_TICKET_PRICE_GEL, MAX_TICKET_PRICE_GEL);
}

function getTicketPriceAttendanceEffectPct(ticketPrice: number): number {
  return clamp(
    (REFERENCE_TICKET_PRICE_GEL - clampTicketPriceGel(ticketPrice)) * TICKET_PRICE_STEP_PCT,
    HIGH_PRICE_PENALTY_PCT,
    LOW_PRICE_BOOST_PCT,
  );
}

export function getProjectedAttendance(input: {
  formPercent: number;
  readiness: number;
  ticketPrice: number;
  stadiumLevel: number;
}) {
  const formPercent = clamp(Math.trunc(input.formPercent), 45, 100);
  const readiness = clamp(Math.trunc(input.readiness), 35, 100);
  const priceEffectPct = getTicketPriceAttendanceEffectPct(input.ticketPrice);
  
  const capacity = getStadiumCapacity(input.stadiumLevel);
  const minAttendance = Math.round(capacity * MIN_MATCHDAY_ATTENDANCE_PCT);

  const projectedPct = BASE_ATTENDANCE_PCT + 
                      (formPercent * FORM_WEIGHT_PCT) + 
                      (readiness * READINESS_WEIGHT_PCT) + 
                      priceEffectPct;

  return clamp(
    Math.round(capacity * projectedPct),
    minAttendance,
    capacity,
  );
}

export function getProjectedMatchdayIncome(input: {
  attendance: number;
  ticketPrice: number;
}) {
  const attendance = Math.max(0, Math.trunc(input.attendance));
  const ticketPrice = clampTicketPriceGel(input.ticketPrice);
  return Math.max(0, roundToNearest(attendance * ticketPrice, CASH_ROUNDING_GEL));
}

// A single player's weekly wage: OVR drives the bulk, age adds a veteran premium,
// and a starting-XI slot (lineupSlot ≤ 11) costs more than a bench/reserve role.
export function getPlayerWeeklyWageGel(player: { ovrCurrent: number; age: number; lineupSlot: number | null }): number {
  const rolePremium = player.lineupSlot !== null && player.lineupSlot <= 11 ? 2200 : 900;
  return (player.ovrCurrent * 180) + (player.age * 40) + rolePremium;
}

export function getProjectedWeeklyWages(players: Array<{ ovrCurrent: number; age: number; lineupSlot: number | null }>) {
  const wages = players.reduce((sum, player) => sum + getPlayerWeeklyWageGel(player), 0);

  return roundToNearest(wages, CASH_ROUNDING_GEL);
}
