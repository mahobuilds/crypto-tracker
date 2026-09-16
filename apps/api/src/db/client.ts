import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import type { Env } from '../env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * One postgres.js pool per connection string. Cron jobs call `createDb(env)` on every run,
 * so the pool is memoized here instead of opening a fresh set of connections each time.
 * `prepare: false` keeps it compatible with Supabase's transaction pooler.
 */
const pools = new Map<string, { db: Database; client: Sql }>();

export function createDb(env: Env): Database {
  const existing = pools.get(env.DATABASE_URL);
  if (existing) return existing.db;
  const client = postgres(env.DATABASE_URL, { prepare: false, max: 5 });
  const db = drizzle(client, { schema });
  pools.set(env.DATABASE_URL, { db, client });
  return db;
}

/** Ends the underlying postgres connection pool; call on process shutdown. */
export async function closeDb(db: Database): Promise<void> {
  for (const [url, pooled] of pools) {
    if (pooled.db !== db) continue;
    pools.delete(url);
    await pooled.client.end();
  }
}
