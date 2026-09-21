import { and, desc, eq } from 'drizzle-orm';
import {
  calculateFee,
  CURRENCIES,
  TRANSACTION_SCOPES,
  TRANSACTION_TYPES,
  applyChange,
  convertToUsd,
  findTimelineViolation,
  ownerSharePct,
  participantSchema,
  type FxRates,
  type Transaction,
  type TransactionInput,
  type TransactionLike,
  type TransactionParticipant,
  type TransactionType,
} from '@crypto-tracker/shared';
import type { Database } from '../db/client';
import { transactions, type NewTransactionRow, type TransactionRow } from '../db/schema';
import { ApiError } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';
import { resolveWalletId } from './wallets';

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** Parses the JSON `participants` column; malformed data is treated as an empty list. */
export function parseParticipants(raw: string): TransactionParticipant[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = participantSchema.array().safeParse(parsed);
  return result.success ? result.data : [];
}

/** Maps a DB row to the public `Transaction` shape. */
export function rowToTransaction(row: TransactionRow): Transaction {
  if (!isOneOf(TRANSACTION_TYPES, row.type)) {
    throw new Error(`Unknown transaction type "${row.type}" for transaction ${row.id}`);
  }
  if (!isOneOf(CURRENCIES, row.currency)) {
    throw new Error(`Unknown currency "${row.currency}" for transaction ${row.id}`);
  }
  if (!isOneOf(TRANSACTION_SCOPES, row.scope)) {
    throw new Error(`Unknown transaction scope "${row.scope}" for transaction ${row.id}`);
  }
  return {
    id: row.id,
    type: row.type,
    scope: row.scope,
    participants: row.scope === 'group' ? parseParticipants(row.participants) : [],
    walletId: row.walletId,
    coinId: row.coinId,
    coinSymbol: row.coinSymbol,
    coinName: row.coinName,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    currency: row.currency,
    pricePerUnitUsd: row.pricePerUnitUsd,
    fee: row.fee,
    feeUsd: row.feeUsd,
    occurredAt: row.occurredAt,
    note: row.note ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Projects a DB row down to the fields the timeline/holdings math needs. */
export function toTransactionLike(row: TransactionRow): TransactionLike {
  if (!isOneOf(TRANSACTION_TYPES, row.type)) {
    throw new Error(`Unknown transaction type "${row.type}" for transaction ${row.id}`);
  }
  if (!isOneOf(TRANSACTION_SCOPES, row.scope)) {
    throw new Error(`Unknown transaction scope "${row.scope}" for transaction ${row.id}`);
  }
  return {
    id: row.id,
    type: row.type,
    coinId: row.coinId,
    coinSymbol: row.coinSymbol,
    coinName: row.coinName,
    quantity: row.quantity,
    pricePerUnitUsd: row.pricePerUnitUsd,
    feeUsd: row.feeUsd,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    ownerSharePct: ownerSharePct(
      row.scope,
      row.scope === 'group' ? parseParticipants(row.participants) : [],
    ),
    walletId: row.walletId,
  };
}

/**
 * Builds a `TransactionLike` for an input that has not been written yet (create/update preview).
 * `walletId` is the resolved wallet, never the raw optional field on the input.
 */
export function inputToLike(
  id: string,
  input: TransactionInput,
  usd: { pricePerUnitUsd: number; feeUsd: number },
  createdAt: string,
  walletId: string,
): TransactionLike {
  return {
    id,
    type: input.type,
    walletId,
    coinId: input.coinId,
    coinSymbol: input.coinSymbol,
    coinName: input.coinName,
    quantity: input.quantity,
    pricePerUnitUsd: usd.pricePerUnitUsd,
    feeUsd: usd.feeUsd,
    occurredAt: input.occurredAt,
    createdAt,
    ownerSharePct: ownerSharePct(input.scope, input.participants),
  };
}

export interface TransactionFilter {
  coinId?: string;
  type?: TransactionType;
  walletId?: string;
}

/** All of a user's transactions, ordered by `occurredAt` desc then `createdAt` desc. */
export async function listTransactions(
  db: Database,
  userId: string,
  filter: TransactionFilter = {},
): Promise<TransactionRow[]> {
  const conditions = [eq(transactions.userId, userId)];
  if (filter.coinId) conditions.push(eq(transactions.coinId, filter.coinId));
  if (filter.type) conditions.push(eq(transactions.type, filter.type));
  if (filter.walletId) conditions.push(eq(transactions.walletId, filter.walletId));

  return db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.occurredAt), desc(transactions.createdAt)],
  });
}

/** The fee is never taken from the client: it is always 0.1% of quantity x price. */
export function withCalculatedFee(input: TransactionInput): TransactionInput {
  return { ...input, fee: calculateFee(input.quantity, input.pricePerUnit) };
}

/** Converts an entered price and fee to USD using the current FX rates. */
export function normalizeUsd(
  input: TransactionInput,
  fx: FxRates,
): { pricePerUnitUsd: number; feeUsd: number } {
  return {
    pricePerUnitUsd: convertToUsd(input.pricePerUnit, input.currency, fx),
    feeUsd: convertToUsd(input.fee, input.currency, fx),
  };
}

function formatQuantity(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '') || '0';
}

/**
 * Runs the given change (create/update/delete) against the existing timeline and throws
 * `ApiError(409, 'INSUFFICIENT_HOLDINGS', ...)` if any sell would exceed the quantity held
 * at that point in the timeline.
 */
export function assertTimelineValid(
  existing: readonly TransactionLike[],
  change: Parameters<typeof applyChange>[1],
): void {
  const violation = findTimelineViolation(applyChange(existing, change));
  if (violation) {
    throw new ApiError(
      409,
      'INSUFFICIENT_HOLDINGS',
      `Cannot sell ${formatQuantity(violation.requested)} ${violation.coinId}; ` +
        `only ${formatQuantity(violation.available)} held on ${violation.occurredAt}`,
    );
  }
}

export function inputToRow(
  id: string,
  userId: string,
  input: TransactionInput,
  usd: { pricePerUnitUsd: number; feeUsd: number },
  createdAt: string,
  updatedAt: string,
  walletId: string,
): NewTransactionRow {
  return {
    id,
    userId,
    type: input.type,
    scope: input.scope,
    participants: JSON.stringify(input.scope === 'group' ? input.participants : []),
    walletId,
    coinId: input.coinId,
    coinSymbol: input.coinSymbol,
    coinName: input.coinName,
    quantity: input.quantity,
    pricePerUnit: input.pricePerUnit,
    currency: input.currency,
    pricePerUnitUsd: usd.pricePerUnitUsd,
    fee: input.fee,
    feeUsd: usd.feeUsd,
    occurredAt: input.occurredAt,
    note: input.note,
    createdAt,
    updatedAt,
  };
}

export async function createTransaction(
  db: Database,
  userId: string,
  rawInput: TransactionInput,
  fx: FxRates,
): Promise<Transaction> {
  const input = withCalculatedFee(rawInput);
  const walletId = await resolveWalletId(db, userId, input.walletId);
  const existingRows = await listTransactions(db, userId);
  const existing = existingRows.map(toTransactionLike);
  const usd = normalizeUsd(input, fx);
  const id = newId();
  const createdAt = nowIso();

  assertTimelineValid(existing, {
    kind: 'create',
    transaction: inputToLike(id, input, usd, createdAt, walletId),
  });

  const [row] = await db
    .insert(transactions)
    .values(inputToRow(id, userId, input, usd, createdAt, createdAt, walletId))
    .returning();
  return rowToTransaction(row as TransactionRow);
}

export async function updateTransaction(
  db: Database,
  userId: string,
  id: string,
  rawInput: TransactionInput,
  fx: FxRates,
): Promise<Transaction> {
  const input = withCalculatedFee(rawInput);
  const existingRows = await listTransactions(db, userId);
  const current = existingRows.find((row) => row.id === id);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Transaction not found');
  }

  // Editing keeps the trade in its wallet unless the input names another one.
  const walletId =
    input.walletId === undefined
      ? current.walletId
      : await resolveWalletId(db, userId, input.walletId);
  const existing = existingRows.map(toTransactionLike);
  const usd = normalizeUsd(input, fx);
  const updatedAt = nowIso();

  assertTimelineValid(existing, {
    kind: 'update',
    transaction: inputToLike(id, input, usd, current.createdAt, walletId),
  });

  const [row] = await db
    .update(transactions)
    .set(inputToRow(id, userId, input, usd, current.createdAt, updatedAt, walletId))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return rowToTransaction(row as TransactionRow);
}

export async function deleteTransaction(db: Database, userId: string, id: string): Promise<void> {
  const existingRows = await listTransactions(db, userId);
  const current = existingRows.find((row) => row.id === id);
  if (!current) {
    throw new ApiError(404, 'NOT_FOUND', 'Transaction not found');
  }

  const existing = existingRows.map(toTransactionLike);
  assertTimelineValid(existing, { kind: 'delete', id });

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}
