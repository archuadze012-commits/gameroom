export const PLAYMANAGER_CURRENCY = '₾';
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

export function getStadiumCapacity(level: number): number {
  return Math.max(1, Math.trunc(level)) * 1000;
}

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
  const formatted = Math.trunc(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${PLAYMANAGER_CURRENCY}`;
}

export function clampTicketPriceGel(ticketPrice: number): number {
  return clamp(Math.trunc(ticketPrice), MIN_TICKET_PRICE_GEL, MAX_TICKET_PRICE_GEL);
}

export function getTicketPriceAttendanceEffectPct(ticketPrice: number): number {
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

export function getProjectedWeeklyWages(players: Array<{ ovrCurrent: number; age: number; lineupSlot: number | null }>) {
  const wages = players.reduce((sum, player) => {
    const rolePremium = player.lineupSlot !== null && player.lineupSlot <= 11 ? 2200 : 900;
    return sum + (player.ovrCurrent * 180) + (player.age * 40) + rolePremium;
  }, 0);

  return roundToNearest(wages, CASH_ROUNDING_GEL);
}
