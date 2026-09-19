import type { Currency, Language, TransactionParticipant } from '@crypto-tracker/shared';
import type { TFunction } from 'i18next';
import { ApiRequestError } from '@/lib/api';
import { formatFiat, formatWholePct } from '@/lib/format';

/** "You 40% · Ali 60%" for a group transaction's list row; the owner always comes first. */
export function formatParticipants(
  participants: readonly TransactionParticipant[],
  language: Language,
  youLabel: string,
): string {
  const ordered = [...participants].sort((a, b) => Number(b.isMe) - Number(a.isMe));
  return ordered
    .map((p) => `${p.isMe ? youLabel : p.name} ${formatWholePct(p.sharePct, language)}`)
    .join(' · ');
}

/** Formats `quantity * pricePerUnit` as a currency amount. */
export function formatTransactionTotal(
  quantity: number,
  pricePerUnit: number,
  currency: Currency,
  language: Language,
): string {
  return formatFiat(quantity * pricePerUnit, currency, language);
}

/** Converts an ISO 8601 timestamp to a value usable by `<input type="datetime-local">`. */
export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a `<input type="datetime-local">` value to an ISO 8601 timestamp, or '' if invalid. */
export function fromDatetimeLocal(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

/** Resolves an error thrown by a transaction mutation to a message to display in the form. */
export function resolveTransactionError(error: unknown, t: TFunction): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 0) return t('errors.network');
    if (error.status === 409) return error.message;
  }
  return t('errors.generic');
}
