import { z } from 'zod';
import type { HistoryRange } from './types';

export const historyRangeSchema = z.enum(['24h', '7d', '30d', '90d', '1y', 'all']);

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const historyRangeMatchesType: AssertEqual<z.infer<typeof historyRangeSchema>, HistoryRange> = true;
void historyRangeMatchesType;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const RANGE_DURATION_MS: Record<Exclude<HistoryRange, 'all'>, number> = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
  '1y': 365 * DAY_MS,
};

/** Lower bound of the history window ending at `now`, or `null` for `all`. */
export function rangeToSince(range: HistoryRange, now: Date): Date | null {
  if (range === 'all') return null;
  return new Date(now.getTime() - RANGE_DURATION_MS[range]);
}
