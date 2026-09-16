import { Hono } from 'hono';
import {
  applyChange,
  parseTransactionsCsv,
  type ImportRequest,
  type ImportResponse,
} from '@crypto-tracker/shared';
import type { CoinResolver, FxProvider } from '../contracts';
import { getOrCreateSettings } from '../db/settings';
import { transactions } from '../db/schema';
import { ApiError } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';
import { requireAuth } from '../middleware/auth';
import { resolveRows } from '../services/import';
import {
  assertTimelineValid,
  inputToLike,
  inputToRow,
  listTransactions,
  normalizeUsd,
  toTransactionLike,
} from '../services/transactions';
import type { AppEnv } from '../types';

export interface ImportRoutesDeps {
  fx: FxProvider;
  coins: CoinResolver;
}

const MAX_CSV_BYTES = 1_000_000;

export function createImportRoutes(deps: ImportRoutesDeps): Hono<AppEnv> {
  return new Hono<AppEnv>().use(requireAuth).post('/', async (c) => {
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Body must be JSON');
    }

    if (typeof payload !== 'object' || payload === null) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Body must be JSON');
    }
    const { csv, mode } = payload as Partial<ImportRequest>;
    if (typeof csv !== 'string' || csv.length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'csv: must be a non-empty string');
    }
    if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'csv: must be at most 1 MB');
    }
    if (mode !== 'preview' && mode !== 'commit') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'mode: must be "preview" or "commit"');
    }

    const db = c.get('db');
    const userId = c.get('user').id;
    const settings = await getOrCreateSettings(db, userId);

    const parseResult = parseTransactionsCsv(csv, { defaultCurrency: settings.baseCurrency });
    if (parseResult.headerErrors.length > 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', parseResult.headerErrors.join('; '));
    }

    const rows = await resolveRows(c.env, deps, parseResult.rows);
    const validCount = rows.filter((row) => row.input !== null).length;
    const errorCount = rows.length - validCount;

    if (mode === 'preview') {
      const body: ImportResponse = { mode, rows, validCount, errorCount, importedCount: 0 };
      return c.json(body);
    }

    if (errorCount > 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Fix the highlighted rows before importing');
    }

    const fx = await deps.fx.getFxRates(c.env);
    const existingRows = await listTransactions(db, userId);
    let timeline = existingRows.map(toTransactionLike);

    const prepared = rows.flatMap((row) => {
      if (!row.input) return [];
      const id = newId();
      const createdAt = nowIso();
      const usd = normalizeUsd(row.input, fx);
      const like = inputToLike(id, row.input, usd, createdAt);
      assertTimelineValid(timeline, { kind: 'create', transaction: like });
      timeline = applyChange(timeline, { kind: 'create', transaction: like });
      return [inputToRow(id, userId, row.input, usd, createdAt, createdAt)];
    });

    for (const row of prepared) {
      await db.insert(transactions).values(row);
    }

    const body: ImportResponse = {
      mode,
      rows,
      validCount,
      errorCount,
      importedCount: prepared.length,
    };
    return c.json(body);
  });
}
