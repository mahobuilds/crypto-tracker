import { and, asc, count, eq, sql } from 'drizzle-orm';
import {
  DEFAULT_WALLET_NAME,
  MAX_WALLETS_PER_USER,
  walletNameKey,
  type Wallet,
  type WalletInput,
} from '@crypto-tracker/shared';
import type { Database } from '../db/client';
import { transactions, wallets, type WalletRow } from '../db/schema';
import { ApiError } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';

export function rowToWallet(row: WalletRow, transactionCount: number): Wallet {
  return {
    id: row.id,
    name: row.name,
    transactionCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** A database handle or the transaction handle `db.transaction` hands its callback. */
type Queryable = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

async function listWalletRows(db: Queryable, userId: string): Promise<WalletRow[]> {
  return db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
    orderBy: [asc(wallets.createdAt), asc(wallets.name)],
  });
}

/** Number of transactions per wallet id for one user. */
async function countTransactionsByWallet(
  db: Database,
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ walletId: transactions.walletId, value: count() })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.walletId);
  return new Map(rows.map((row) => [row.walletId, row.value]));
}

async function insertWallet(db: Queryable, userId: string, name: string): Promise<WalletRow> {
  const now = nowIso();
  const row: WalletRow = { id: newId(), userId, name, createdAt: now, updatedAt: now };
  await db.insert(wallets).values(row);
  return row;
}

/**
 * The user's wallet rows, oldest first, creating the default wallet when there are none.
 * The first dashboard load fires several requests at once (wallet list, portfolio, first
 * trade), so creation is serialised per user with an advisory lock; otherwise each request
 * would insert its own "Main wallet".
 */
async function ensureWalletRows(db: Database, userId: string): Promise<WalletRow[]> {
  const existing = await listWalletRows(db, userId);
  if (existing.length > 0) return existing;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const rows = await listWalletRows(tx, userId);
    if (rows.length > 0) return rows;
    return [await insertWallet(tx, userId, DEFAULT_WALLET_NAME)];
  });
}

/**
 * The user's wallets, oldest first. A user with none gets the default wallet created on
 * the spot, so every caller can rely on at least one wallet existing.
 */
export async function listWallets(db: Database, userId: string): Promise<Wallet[]> {
  const rows = await ensureWalletRows(db, userId);
  const counts = await countTransactionsByWallet(db, userId);
  return rows.map((row) => rowToWallet(row, counts.get(row.id) ?? 0));
}

/** The wallet new transactions fall into when none is chosen: the oldest one. */
export async function ensureDefaultWallet(db: Database, userId: string): Promise<WalletRow> {
  const [first] = await ensureWalletRows(db, userId);
  return first!;
}

export async function getWalletRow(db: Database, userId: string, id: string): Promise<WalletRow> {
  const row = await db.query.wallets.findFirst({
    where: and(eq(wallets.id, id), eq(wallets.userId, userId)),
  });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Wallet not found');
  return row;
}

/**
 * Resolves the wallet a transaction should go into: the given id (which must belong to the
 * user) or the default wallet when none was sent.
 */
export async function resolveWalletId(
  db: Database,
  userId: string,
  walletId: string | undefined,
): Promise<string> {
  if (walletId === undefined) return (await ensureDefaultWallet(db, userId)).id;
  return (await getWalletRow(db, userId, walletId)).id;
}

/** Throws 409 when another wallet of the user already carries `name` (ignoring case). */
export function assertWalletNameFree(
  rows: readonly Pick<WalletRow, 'id' | 'name'>[],
  name: string,
  exceptId?: string,
): void {
  const key = walletNameKey(name);
  const clash = rows.find((row) => row.id !== exceptId && walletNameKey(row.name) === key);
  if (clash) {
    throw new ApiError(409, 'WALLET_NAME_TAKEN', `You already have a wallet named "${clash.name}"`);
  }
}

export async function createWallet(
  db: Database,
  userId: string,
  input: WalletInput,
): Promise<Wallet> {
  // The default wallet always comes first, so a user's own wallets sit next to it rather
  // than replacing it.
  const rows = await ensureWalletRows(db, userId);
  if (rows.length >= MAX_WALLETS_PER_USER) {
    throw new ApiError(
      400,
      'LIMIT_REACHED',
      `You can have at most ${MAX_WALLETS_PER_USER} wallets`,
    );
  }
  assertWalletNameFree(rows, input.name);
  const row = await insertWallet(db, userId, input.name);
  return rowToWallet(row, 0);
}

export async function updateWallet(
  db: Database,
  userId: string,
  id: string,
  input: WalletInput,
): Promise<Wallet> {
  const rows = await listWalletRows(db, userId);
  const current = rows.find((row) => row.id === id);
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Wallet not found');
  assertWalletNameFree(rows, input.name, id);

  const updatedAt = nowIso();
  await db
    .update(wallets)
    .set({ name: input.name, updatedAt })
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));
  const counts = await countTransactionsByWallet(db, userId);
  return rowToWallet({ ...current, name: input.name, updatedAt }, counts.get(id) ?? 0);
}

/** Message for a wallet that cannot be deleted because trades still sit in it. */
export function walletNotEmptyMessage(used: number): string {
  const noun = used === 1 ? 'transaction' : 'transactions';
  return `This wallet still has ${used} ${noun}; move or delete them first`;
}

/** Deletes an empty wallet. A wallet that still holds transactions is refused with 409. */
export async function deleteWallet(db: Database, userId: string, id: string): Promise<void> {
  await getWalletRow(db, userId, id);
  const [row] = await db
    .select({ value: count() })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.walletId, id)));
  const used = row?.value ?? 0;
  if (used > 0) {
    throw new ApiError(409, 'WALLET_NOT_EMPTY', walletNotEmptyMessage(used));
  }
  await db.delete(wallets).where(and(eq(wallets.id, id), eq(wallets.userId, userId)));
}
