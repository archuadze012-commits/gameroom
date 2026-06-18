import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  clampTicketPriceGel,
  EA_FC_TOP_OVR,
  getBaseTransferValueGel,
  getCurrentTransferValueGel,
  getProjectedAttendance,
  getProjectedMatchdayIncome,
  getProjectedWeeklyWages,
  getStadiumCapacity,
  MAX_TRANSFER_VALUE_GEL,
  MAX_TICKET_PRICE_GEL,
  MIN_TICKET_PRICE_GEL,
  STARTING_TEAM_BALANCE_GEL,
  TOP_OVR_BASE_TRANSFER_VALUE_GEL,
  TRANSFER_VALUE_PER_OVR_GAIN_GEL,
} from './economy.js';

test('top EA FC OVR base transfer value is 100 million GEL', () => {
  assert.equal(EA_FC_TOP_OVR, 91);
  assert.equal(getBaseTransferValueGel(EA_FC_TOP_OVR), TOP_OVR_BASE_TRANSFER_VALUE_GEL);
});

test('player value grows by 2 million GEL per OVR gain', () => {
  const baseOvr = 80;
  assert.equal(
    getCurrentTransferValueGel(baseOvr, baseOvr + 1),
    getBaseTransferValueGel(baseOvr) + TRANSFER_VALUE_PER_OVR_GAIN_GEL,
  );
});

test('player value is capped at 150 million GEL', () => {
  assert.equal(
    getCurrentTransferValueGel(EA_FC_TOP_OVR, EA_FC_TOP_OVR + 99),
    MAX_TRANSFER_VALUE_GEL,
  );
});

test('new teams start with 1 million GEL', () => {
  assert.equal(STARTING_TEAM_BALANCE_GEL, 1_000_000);
});

test('ticket price is clamped to the supported football economy range', () => {
  assert.equal(clampTicketPriceGel(2), MIN_TICKET_PRICE_GEL);
  assert.equal(clampTicketPriceGel(999), MAX_TICKET_PRICE_GEL);
});

test('projected attendance stays inside stadium capacity', () => {
  const level = 45;
  const capacity = getStadiumCapacity(level);
  assert.equal(
    getProjectedAttendance({ formPercent: 100, readiness: 100, ticketPrice: 10, stadiumLevel: level }),
    capacity,
  );
  const minAttendance = Math.round(capacity * 0.40);
  const expensiveTicketAttendance = getProjectedAttendance({
    formPercent: 45,
    readiness: 35,
    ticketPrice: 80,
    stadiumLevel: level,
  });

  assert.ok(
    expensiveTicketAttendance >= minAttendance &&
      expensiveTicketAttendance < capacity,
  );
});

test('projected matchday income scales with attendance and clamps ticket prices', () => {
  assert.equal(
    getProjectedMatchdayIncome({ attendance: 100_000, ticketPrice: 999 }),
    Math.round(100_000 * MAX_TICKET_PRICE_GEL / 500) * 500,
  );
});

test('weekly wages increase for starters and stronger players', () => {
  const benchWages = getProjectedWeeklyWages([
    { ovrCurrent: 65, age: 20, lineupSlot: 18 },
  ]);
  const starterWages = getProjectedWeeklyWages([
    { ovrCurrent: 78, age: 25, lineupSlot: 7 },
  ]);

  assert.ok(starterWages > benchWages);
  assert.equal(starterWages % 500, 0);
});
