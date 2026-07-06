import { strict as assert } from 'node:assert';
import { test, before, after, beforeEach } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration tests for the gameroom wallet economy — the currency-
// mutating RPCs the app calls (purchase_shop_item_as, claim_daily_bonus_as,
// admin_grant_currency_as). Runs the REAL live function bodies (loadRpc pulls
// the latest definition from supabase/migrations) against Postgres, pinning the
// money-safety invariants: daily-bonus idempotency, purchase ownership +
// insufficient-funds, and the admin-role gate + amount/currency validation on
// grants. Previously these had zero coverage.

let db: PGlite;

const U = 'aaaa1111-0000-0000-0000-000000000001';
const ADMIN = 'aaaa2222-0000-0000-0000-000000000002';

const jbal = async (userId: string) =>
  (await db.query<{ nc_balance: number; pro_balance: number }>(
    'select nc_balance, pro_balance from wallets where user_id=$1',
    [userId],
  )).rows[0];
const txCount = async (userId: string, type: string) =>
  Number(
    (await db.query<{ n: number }>(
      "select count(*)::int as n from wallet_transactions where user_id=$1 and type=$2",
      [userId, type],
    )).rows[0].n,
  );

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.profiles (
      id uuid primary key, role text default 'user', last_login_award_at date
    );
    create table public.wallets (
      user_id uuid primary key,
      nc_balance integer not null default 0,
      pro_balance integer not null default 0,
      updated_at timestamptz default now()
    );
    create table public.wallet_transactions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid, currency text, amount integer, type text, note text,
      granted_by uuid, created_at timestamptz default now()
    );
    create table public.shop_items (
      id uuid primary key default gen_random_uuid(),
      name text, is_active boolean default true, cost_currency text, cost_amount integer
    );
    create table public.user_purchases (
      id uuid primary key default gen_random_uuid(),
      user_id uuid, item_id uuid, unique (user_id, item_id)
    );
  `);
  await loadRpc(db, 'claim_daily_bonus_as');
  await loadRpc(db, 'purchase_shop_item_as');
  await loadRpc(db, 'admin_grant_currency_as');
});
after(async () => { await db?.close(); });

beforeEach(async () => {
  await db.exec('truncate profiles, wallets, wallet_transactions, shop_items, user_purchases;');
  await db.query("insert into profiles (id, role) values ($1,'user'),($2,'admin')", [U, ADMIN]);
});

// ── claim_daily_bonus_as ────────────────────────────────────────────────────
test('daily bonus: first claim grants 10 nc, stamps the date, logs a transaction', async () => {
  const r = (await db.query<{ r: { success: boolean; amount: number; currency: string } }>(
    'select claim_daily_bonus_as($1) as r', [U])).rows[0].r;
  assert.equal(r.success, true);
  assert.equal(r.amount, 10);
  assert.equal(r.currency, 'nc');
  assert.equal((await jbal(U)).nc_balance, 10);
  assert.equal(await txCount(U, 'daily_bonus'), 1);
});

test('daily bonus: a second claim the same day is rejected (idempotent per day)', async () => {
  await db.query('select claim_daily_bonus_as($1)', [U]);
  const r = (await db.query<{ r: { success: boolean; error: string } }>(
    'select claim_daily_bonus_as($1) as r', [U])).rows[0].r;
  assert.equal(r.success, false);
  assert.equal(r.error, 'already_claimed');
  assert.equal((await jbal(U)).nc_balance, 10, 'no second grant');
  assert.equal(await txCount(U, 'daily_bonus'), 1);
});

test('daily bonus: claimable again once a new day starts', async () => {
  await db.query('select claim_daily_bonus_as($1)', [U]);
  await db.query("update profiles set last_login_award_at = current_date - 1 where id=$1", [U]);
  const r = (await db.query<{ r: { success: boolean } }>('select claim_daily_bonus_as($1) as r', [U])).rows[0].r;
  assert.equal(r.success, true);
  assert.equal((await jbal(U)).nc_balance, 20);
});

test('daily bonus: null user is not_authenticated', async () => {
  const r = (await db.query<{ r: { success: boolean; error: string } }>(
    'select claim_daily_bonus_as(null) as r')).rows[0].r;
  assert.equal(r.success, false);
  assert.equal(r.error, 'not_authenticated');
});

// ── purchase_shop_item_as ───────────────────────────────────────────────────
async function seedItem(currency: string, amount: number, active = true): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into shop_items (name, is_active, cost_currency, cost_amount) values ('Item',$1,$2,$3) returning id",
    [active, currency, amount],
  );
  return rows[0].id;
}

test('purchase: happy path debits nc, records the purchase + spend transaction', async () => {
  await db.query('insert into wallets (user_id, nc_balance) values ($1, 100)', [U]);
  const item = await seedItem('nc', 30);
  const r = (await db.query<{ r: { success: boolean } }>('select purchase_shop_item_as($1,$2) as r', [U, item])).rows[0].r;
  assert.equal(r.success, true);
  assert.equal((await jbal(U)).nc_balance, 70);
  assert.equal(await txCount(U, 'spend'), 1);
  const owned = Number((await db.query<{ n: number }>('select count(*)::int n from user_purchases where user_id=$1', [U])).rows[0].n);
  assert.equal(owned, 1);
});

test('purchase: buying the same item twice is already_owned, no second debit', async () => {
  await db.query('insert into wallets (user_id, nc_balance) values ($1, 100)', [U]);
  const item = await seedItem('nc', 30);
  await db.query('select purchase_shop_item_as($1,$2)', [U, item]);
  const r = (await db.query<{ r: { success: boolean; error: string } }>('select purchase_shop_item_as($1,$2) as r', [U, item])).rows[0].r;
  assert.equal(r.success, false);
  assert.equal(r.error, 'already_owned');
  assert.equal((await jbal(U)).nc_balance, 70, 'balance unchanged on re-purchase');
});

test('purchase: insufficient funds does not debit or grant the item', async () => {
  await db.query('insert into wallets (user_id, nc_balance) values ($1, 10)', [U]);
  const item = await seedItem('nc', 1000);
  const r = (await db.query<{ r: { success: boolean; error: string } }>('select purchase_shop_item_as($1,$2) as r', [U, item])).rows[0].r;
  assert.equal(r.success, false);
  assert.equal(r.error, 'insufficient_funds');
  assert.equal((await jbal(U)).nc_balance, 10);
  assert.equal(Number((await db.query<{ n: number }>('select count(*)::int n from user_purchases where user_id=$1', [U])).rows[0].n), 0);
});

test('purchase: inactive/unknown item is item_not_found', async () => {
  await db.query('insert into wallets (user_id, nc_balance) values ($1, 100)', [U]);
  const item = await seedItem('nc', 30, false); // inactive
  const r = (await db.query<{ r: { error: string } }>('select purchase_shop_item_as($1,$2) as r', [U, item])).rows[0].r;
  assert.equal(r.error, 'item_not_found');
});

test('purchase: a pro-currency item debits the pro balance', async () => {
  await db.query('insert into wallets (user_id, nc_balance, pro_balance) values ($1, 5, 50)', [U]);
  const item = await seedItem('pro', 20);
  const r = (await db.query<{ r: { success: boolean } }>('select purchase_shop_item_as($1,$2) as r', [U, item])).rows[0].r;
  assert.equal(r.success, true);
  const b = await jbal(U);
  assert.equal(b.pro_balance, 30);
  assert.equal(b.nc_balance, 5, 'nc untouched');
});

// ── admin_grant_currency_as ─────────────────────────────────────────────────
test('admin grant: an admin can grant nc; balance + granted_by transaction recorded', async () => {
  const r = (await db.query<{ r: { success: boolean; amount: number } }>(
    "select admin_grant_currency_as($1,$2,'nc',100,'test') as r", [ADMIN, U])).rows[0].r;
  assert.equal(r.success, true);
  assert.equal((await jbal(U)).nc_balance, 100);
  const tx = (await db.query<{ granted_by: string; type: string }>(
    "select granted_by, type from wallet_transactions where user_id=$1 and type='admin_grant'", [U])).rows[0];
  assert.equal(tx.granted_by, ADMIN);
});

test('admin grant: a non-admin caller is unauthorized and grants nothing', async () => {
  const r = (await db.query<{ r: { success: boolean; error: string } }>(
    "select admin_grant_currency_as($1,$2,'nc',100,null) as r", [U, ADMIN])).rows[0].r; // U is role 'user'
  assert.equal(r.success, false);
  assert.equal(r.error, 'unauthorized');
  const w = await db.query('select 1 from wallets where user_id=$1', [ADMIN]);
  assert.equal(w.rows.length, 0, 'no wallet created for the grant target');
});

test('admin grant: invalid currency and non-positive amount are rejected', async () => {
  const bad = (await db.query<{ r: { error: string } }>(
    "select admin_grant_currency_as($1,$2,'xyz',100,null) as r", [ADMIN, U])).rows[0].r;
  assert.equal(bad.error, 'invalid_currency');
  const zero = (await db.query<{ r: { error: string } }>(
    "select admin_grant_currency_as($1,$2,'nc',0,null) as r", [ADMIN, U])).rows[0].r;
  assert.equal(zero.error, 'invalid_amount');
});
