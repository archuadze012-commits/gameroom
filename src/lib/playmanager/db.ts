import 'server-only';
import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface DbError {
  message: string;
}

interface QueryResult<T> {
  data: T[] | null;
  error: DbError | null;
  count: number | null;
}

interface SingleQueryResult<T> {
  data: T | null;
  error: DbError | null;
}

interface PlayManagerQuery<T> extends PromiseLike<QueryResult<T>> {
  select(columns: string, options?: { count?: 'exact'; head?: boolean }): PlayManagerQuery<T>;
  eq(column: string, value: unknown): PlayManagerQuery<T>;
  is(column: string, value: unknown): PlayManagerQuery<T>;
  order(column: string, options?: { ascending?: boolean }): PlayManagerQuery<T>;
  limit(count: number): PlayManagerQuery<T>;
  single(): Promise<SingleQueryResult<T>>;
}

interface RpcResult<T = unknown> {
  data: T | null;
  error: DbError | null;
}

interface PlayManagerDb {
  from<T>(table: string): PlayManagerQuery<T>;
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<RpcResult<T>>;
}

export function asPlayManagerDb(
  client: ReturnType<typeof createSupabaseAdminClient>,
): PlayManagerDb {
  return client as unknown as PlayManagerDb;
}
