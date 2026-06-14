export const PLAYMANAGER_CURRENCY = '₾';
export const STARTING_TEAM_BALANCE_GEL = 1_000_000;

export const EA_FC_TOP_OVR = 91;
export const TOP_OVR_BASE_TRANSFER_VALUE_GEL = 100_000_000;
export const MAX_TRANSFER_VALUE_GEL = 150_000_000;
export const TRANSFER_VALUE_PER_OVR_GAIN_GEL = 2_000_000;
export const STADIUM_CAPACITY = 45_000;
export const MIN_MATCHDAY_ATTENDANCE = 18_000;
export const MIN_TICKET_PRICE_GEL = 10;
export const MAX_TICKET_PRICE_GEL = 80;

const MIN_OVR = 40;
const MIN_BASE_TRANSFER_VALUE_GEL = 100_000;
const VALUE_ROUNDING_GEL = 50_000;
const REFERENCE_TICKET_PRICE_GEL = 28;
const TICKET_PRICE_ATTENDANCE_STEP = 520;
const LOW_PRICE_ATTENDANCE_BOOST = 4_500;
const HIGH_PRICE_ATTENDANCE_PENALTY = -7_000;
const BASE_ATTENDANCE = 34_300;
const FORM_ATTENDANCE_WEIGHT = 42;
const READINESS_ATTENDANCE_WEIGHT = 20;
const CASH_ROUNDING_GEL = 500;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

export function getBaseTransferValueGel(ovr: number): number {
  const safeOvr = clamp(Math.trunc(ovr), MIN_OVR, EA_FC_TOP_OVR);
  const progress = (safeOvr - MIN_OVR) / (EA_FC_TOP_OVR - MIN_OVR);
  const value =
    MIN_BASE_TRANSFER_VALUE_GEL +
    (TOP_OVR_BASE_TRANSFER_VALUE_GEL - MIN_BASE_TRANSFER_VALUE_GEL) *
      Math.pow(progress, 5);

  return clamp(
    roundToNearest(value, VALUE_ROUNDING_GEL),
    MIN_BASE_TRANSFER_VALUE_GEL,
    TOP_OVR_BASE_TRANSFER_VALUE_GEL,
  );
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

export function formatGel(amount: number): string {
  return `${Math.trunc(amount).toLocaleString('ka-GE')} ${PLAYMANAGER_CURRENCY}`;
}

export function clampTicketPriceGel(ticketPrice: number): number {
  return clamp(Math.trunc(ticketPrice), MIN_TICKET_PRICE_GEL, MAX_TICKET_PRICE_GEL);
}

export function getTicketPriceAttendanceEffect(ticketPrice: number): number {
  return clamp(
    (REFERENCE_TICKET_PRICE_GEL - clampTicketPriceGel(ticketPrice)) *
      TICKET_PRICE_ATTENDANCE_STEP,
    HIGH_PRICE_ATTENDANCE_PENALTY,
    LOW_PRICE_ATTENDANCE_BOOST,
  );
}

export function getProjectedAttendance(input: {
  formPercent: number;
  readiness: number;
  ticketPrice: number;
}) {
  const formPercent = clamp(Math.trunc(input.formPercent), 45, 100);
  const readiness = clamp(Math.trunc(input.readiness), 35, 100);
  const priceEffect = getTicketPriceAttendanceEffect(input.ticketPrice);
  return clamp(
    Math.round(
      BASE_ATTENDANCE +
        (formPercent * FORM_ATTENDANCE_WEIGHT) +
        (readiness * READINESS_ATTENDANCE_WEIGHT) +
        priceEffect,
    ),
    MIN_MATCHDAY_ATTENDANCE,
    STADIUM_CAPACITY,
  );
}

export function getProjectedMatchdayIncome(input: {
  attendance: number;
  ticketPrice: number;
}) {
  const attendance = clamp(Math.trunc(input.attendance), 0, STADIUM_CAPACITY);
  const ticketPrice = clampTicketPriceGel(input.ticketPrice);
  return Math.max(0, roundToNearest(attendance * ticketPrice, CASH_ROUNDING_GEL));
}

export function getProjectedWeeklyWages(players: Array<{ ovrCurrent: number; age: number; lineupSlot: number | null }>) {
  const wages = players.reduce((sum, player) => {
    const rolePremium = player.lineupSlot !== null && player.lineupSlot <= 11 ? 2200 : 900;
    return sum + (player.ovrCurrent * 180) + (player.age * 40) + rolePremium;
  }, 0);

  return roundToNearest(wages, CASH_ROUNDING_GEL);
}
