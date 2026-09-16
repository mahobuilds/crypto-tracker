import {
  transactionInputSchema,
  type CsvRowResult,
  type ImportRowResult,
  type TransactionInput,
} from '@crypto-tracker/shared';
import type { CoinResolver } from '../contracts';

export interface ImportDeps {
  coins: CoinResolver;
}

/**
 * Resolves each parsed CSV row's coin ticker/id into a `TransactionInput`, caching coin
 * lookups per distinct string within the request. Rows that already failed CSV validation
 * pass through unchanged; rows whose coin cannot be resolved get an `errors` entry.
 */
export async function resolveRows(
  env: Env,
  deps: ImportDeps,
  rows: readonly CsvRowResult[],
): Promise<ImportRowResult[]> {
  const cache = new Map<string, Awaited<ReturnType<CoinResolver['resolveCoin']>>>();

  const resolve = async (query: string) => {
    const cached = cache.get(query);
    if (cached !== undefined) return cached;
    const result = await deps.coins.resolveCoin(env, query);
    cache.set(query, result);
    return result;
  };

  const results: ImportRowResult[] = [];

  for (const row of rows) {
    if (!row.values) {
      results.push({ line: row.line, input: null, errors: row.errors });
      continue;
    }

    const coin = await resolve(row.values.coin);
    if (!coin) {
      results.push({
        line: row.line,
        input: null,
        errors: [`coin "${row.values.coin}" not found`],
      });
      continue;
    }

    const candidate: TransactionInput = {
      type: row.values.type,
      coinId: coin.id,
      coinSymbol: coin.symbol.toUpperCase(),
      coinName: coin.name,
      quantity: row.values.quantity,
      pricePerUnit: row.values.pricePerUnit,
      currency: row.values.currency,
      fee: row.values.fee,
      occurredAt: row.values.occurredAt,
      note: row.values.note,
    };

    const parsed = transactionInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      results.push({ line: row.line, input: null, errors });
      continue;
    }

    results.push({ line: row.line, input: parsed.data, errors: [] });
  }

  return results;
}
