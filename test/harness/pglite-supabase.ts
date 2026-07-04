import type { PGlite } from '@electric-sql/pglite';

// ── supabase-js → pglite adapter (flat queries) ──────────────────────────────
// A small stand-in for the supabase-js query builder, backed by the pglite test
// engine, so real TypeScript code that takes a `db` client can run against a
// real Postgres in tests. Supports the FLAT query surface the PlayManager server
// actions / lib functions use:
//
//   from(t).select(cols, {count,head}) .eq/.neq/.in/.is/.lt/.lte/.gt/.gte
//           .or('a.eq.1,b.eq.2') .order() .limit() .range() .single()/.maybeSingle()
//   from(t).insert(v).select()  .update(v).eq().select()  .upsert(v,{onConflict})  .delete().eq()
//   rpc(name, params)
//
// NOT supported: nested foreign-table embeds (`player:pm_players(...)`) — those
// are PostgREST relationship resolution; embed-heavy paths should load the real
// RPC (loadRpc) or query flat/raw instead. Every terminal resolves to the
// supabase shape `{ data, error, count }` and the builder is awaitable.

type Row = Record<string, unknown>;
type Filter = { col: string; op: string; val: unknown };

const OPS: Record<string, string> = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
};

function lit(val: unknown): string {
  // Inline literal for or() sub-expressions (values come from trusted test code).
  if (val === null || val === 'null') return 'null';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

class Query implements PromiseLike<{ data: unknown; error: null; count: number | null }> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private cols = '*';
  private values: Row[] = [];
  private onConflict: string | null = null;
  private returning = false;
  private filters: Filter[] = [];
  private ors: string[] = [];
  private orderBy: string[] = [];
  private limitN: number | null = null;
  private rangeFromTo: [number, number] | null = null;
  private rowMode: 'many' | 'single' | 'maybe' = 'many';
  private countMode = false;
  private headMode = false;

  constructor(private db: PGlite, private table: string) {}

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    if (this.op === 'insert' || this.op === 'update' || this.op === 'upsert') {
      this.returning = true;
    } else {
      this.op = 'select';
    }
    this.cols = cols || '*';
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headMode = true;
    return this;
  }
  insert(values: Row | Row[]) { this.op = 'insert'; this.values = Array.isArray(values) ? values : [values]; return this; }
  update(values: Row) { this.op = 'update'; this.values = [values]; return this; }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'; this.values = Array.isArray(values) ? values : [values];
    this.onConflict = opts?.onConflict ?? null; return this;
  }
  delete() { this.op = 'delete'; return this; }

  eq(col: string, val: unknown) { this.filters.push({ col, op: 'eq', val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ col, op: 'neq', val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ col, op: 'gt', val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ col, op: 'gte', val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ col, op: 'lt', val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ col, op: 'lte', val }); return this; }
  is(col: string, val: unknown) { this.filters.push({ col, op: 'is', val }); return this; }
  in(col: string, vals: unknown[]) { this.filters.push({ col, op: 'in', val: vals }); return this; }
  or(expr: string) { this.ors.push(expr); return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push(`${col} ${opts?.ascending === false ? 'desc' : 'asc'}`); return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFromTo = [from, to]; return this; }
  single() { this.rowMode = 'single'; return this; }
  maybeSingle() { this.rowMode = 'maybe'; return this; }

  // ── Build WHERE from filters + or() groups ──
  private where(params: unknown[]): string {
    const parts: string[] = [];
    for (const f of this.filters) {
      if (f.op === 'in') {
        const arr = f.val as unknown[];
        if (arr.length === 0) { parts.push('false'); continue; }
        const ph = arr.map((v) => { params.push(v); return `$${params.length}`; });
        parts.push(`${f.col} in (${ph.join(', ')})`);
      } else if (f.op === 'is') {
        parts.push(`${f.col} is ${f.val === null ? 'null' : lit(f.val)}`);
      } else {
        params.push(f.val);
        parts.push(`${f.col} ${OPS[f.op]} $${params.length}`);
      }
    }
    for (const orExpr of this.ors) {
      // 'a.eq.1,b.eq.2' → (a = 1 or b = 2)
      const sub = orExpr.split(',').map((clause) => {
        const [col, op, ...rest] = clause.split('.');
        const raw = rest.join('.');
        if (op === 'is') return `${col} is ${raw === 'null' ? 'null' : lit(raw)}`;
        return `${col} ${OPS[op] ?? '='} ${lit(raw)}`;
      });
      parts.push(`(${sub.join(' or ')})`);
    }
    return parts.length ? ` where ${parts.join(' and ')}` : '';
  }

  private colList(vals: Row): string[] { return Object.keys(vals); }
  private valuePlaceholders(vals: Row, cols: string[], params: unknown[]): string {
    return cols.map((c) => { params.push(serialize(vals[c])); return `$${params.length}`; }).join(', ');
  }

  private async run(): Promise<{ data: unknown; error: null; count: number | null }> {
    const params: unknown[] = [];
    let sql = '';
    const ret = this.returning ? ` returning ${parseCols(this.cols)}` : '';

    if (this.op === 'select') {
      const selectExpr = this.countMode ? 'count(*)::int as count' : parseCols(this.cols);
      sql = `select ${selectExpr} from ${this.table}${this.where(params)}`;
      if (!this.countMode) {
        if (this.orderBy.length) sql += ` order by ${this.orderBy.join(', ')}`;
        if (this.rangeFromTo) sql += ` limit ${this.rangeFromTo[1] - this.rangeFromTo[0] + 1} offset ${this.rangeFromTo[0]}`;
        else if (this.limitN != null) sql += ` limit ${this.limitN}`;
      }
    } else if (this.op === 'insert' || this.op === 'upsert') {
      const cols = this.colList(this.values[0]);
      const rowsSql = this.values.map((v) => `(${this.valuePlaceholders(v, cols, params)})`).join(', ');
      sql = `insert into ${this.table} (${cols.join(', ')}) values ${rowsSql}`;
      if (this.op === 'upsert') {
        const target = this.onConflict ?? cols[0];
        const setCols = cols.filter((c) => !target.split(',').map((t) => t.trim()).includes(c));
        sql += ` on conflict (${target}) do update set ${setCols.map((c) => `${c} = excluded.${c}`).join(', ') || `${cols[0]} = excluded.${cols[0]}`}`;
      }
      sql += ret;
    } else if (this.op === 'update') {
      const cols = this.colList(this.values[0]);
      const setSql = cols.map((c) => { params.push(serialize(this.values[0][c])); return `${c} = $${params.length}`; }).join(', ');
      sql = `update ${this.table} set ${setSql}${this.where(params)}${ret}`;
    } else {
      sql = `delete from ${this.table}${this.where(params)}${ret}`;
    }

    const res = await this.db.query(sql, params);
    const rows = res.rows as Row[];

    if (this.countMode) {
      const count = rows.length ? Number((rows[0] as { count: number }).count) : 0;
      return { data: this.headMode ? null : rows, error: null, count };
    }
    if (this.op !== 'select' && !this.returning) {
      return { data: null, error: null, count: null };
    }
    if (this.rowMode === 'single') return { data: rows[0] ?? null, error: null, count: null };
    if (this.rowMode === 'maybe') return { data: rows[0] ?? null, error: null, count: null };
    return { data: rows, error: null, count: null };
  }

  then<TResult1 = { data: unknown; error: null; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

function serialize(val: unknown): unknown {
  if (val !== null && typeof val === 'object' && !Array.isArray(val)) return JSON.stringify(val);
  return val;
}

// Reduce a supabase select string to the FLAT columns pglite understands. Nested
// foreign-table embeds (`alias:table(...)`) are dropped — code that reads them
// gets undefined and falls back to its default. `alias:col` renames become
// `col as alias`.
export function parseCols(cols: string): string {
  if (cols === '*' || cols.trim() === '') return cols || '*';
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of cols) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur) parts.push(cur);

  const flat = parts
    .map((p) => p.trim())
    .filter((p) => p && !p.includes('('))
    .map((p) => {
      const bang = p.split('!')[0].trim(); // strip FK hints like profiles!fk(...)
      if (bang.includes(':')) {
        const [alias, col] = bang.split(':').map((s) => s.trim());
        return `${col} as ${alias}`;
      }
      return bang;
    });
  return flat.length ? flat.join(', ') : '*';
}

export class PgliteSupabase {
  constructor(private db: PGlite) {}
  from(table: string) { return new Query(this.db, table); }
  async rpc(name: string, params: Record<string, unknown> = {}) {
    const keys = Object.keys(params);
    const args: unknown[] = [];
    const argSql = keys.map((k) => { args.push(serialize(params[k])); return `${k} => $${args.length}`; }).join(', ');
    const { rows } = await this.db.query(`select public.${name}(${argSql}) as data`, args);
    return { data: rows.length ? (rows[0] as { data: unknown }).data : null, error: null };
  }
}

// Wrap a pglite instance as a supabase-like client for injection into real code.
export function asSupabase(db: PGlite): PgliteSupabase {
  return new PgliteSupabase(db);
}
