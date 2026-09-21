import { z } from 'zod';
import {
  CURRENCIES,
  SHARE_PCT_MAX,
  SHARE_PCT_MIN,
  SHARE_PCT_TOTAL,
  TRANSACTION_SCOPES,
  TRANSACTION_TYPES,
} from './constants';
import type { TransactionInput, TransactionParticipant } from './types';

const isoDatetime = z.iso.datetime({ offset: true, local: true });

/** Non-empty trimmed string with a maximum length. */
export const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const coinIdSchema = trimmedString(100);
export const coinSymbolSchema = trimmedString(20).transform((value) => value.toUpperCase());
export const coinNameSchema = trimmedString(100);

/**
 * ISO 8601 date-time, with or without a UTC offset. The output is normalized to
 * `new Date(value).toISOString()` so stored timestamps always have the same shape.
 */
export const occurredAtSchema = z
  .string()
  .trim()
  .refine((value) => isoDatetime.safeParse(value).success, {
    message: 'Must be an ISO 8601 date-time',
  })
  .transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Invalid date' });
      return z.NEVER;
    }
    return date.toISOString();
  });

export const noteSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .default(null)
  .transform((value) => (value === '' ? null : value));

export const participantSchema = z.object({
  name: trimmedString(100),
  sharePct: z.number().int().min(SHARE_PCT_MIN).max(SHARE_PCT_MAX),
  isMe: z.boolean().default(false),
});

/** Sum of the participants' shares in percent. */
export function totalSharePct(participants: readonly TransactionParticipant[]): number {
  return participants.reduce((sum, participant) => sum + participant.sharePct, 0);
}

/** The owner's share of a trade in percent: 100 for personal trades, their participant row for group trades. */
export function ownerSharePct(
  scope: 'personal' | 'group',
  participants: readonly TransactionParticipant[],
): number {
  if (scope === 'personal') return SHARE_PCT_TOTAL;
  return participants.find((participant) => participant.isMe)?.sharePct ?? SHARE_PCT_TOTAL;
}

/** Largest share a new participant may take given the ones already added. */
export function maxSharePctFor(participants: readonly TransactionParticipant[]): number {
  return Math.max(0, Math.min(SHARE_PCT_MAX, SHARE_PCT_TOTAL - totalSharePct(participants)));
}

export const transactionInputSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    scope: z.enum(TRANSACTION_SCOPES).default('personal'),
    participants: z.array(participantSchema).max(50).default([]),
    walletId: trimmedString(100).optional(),
    coinId: coinIdSchema,
    coinSymbol: coinSymbolSchema,
    coinName: coinNameSchema,
    quantity: z.number().finite().positive(),
    pricePerUnit: z.number().finite().nonnegative(),
    currency: z.enum(CURRENCIES),
    fee: z.number().finite().nonnegative().default(0),
    occurredAt: occurredAtSchema,
    note: noteSchema,
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'personal') {
      if (value.participants.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['participants'],
          message: 'A personal transaction has no participants',
        });
      }
      return;
    }
    if (totalSharePct(value.participants) !== SHARE_PCT_TOTAL) {
      ctx.addIssue({
        code: 'custom',
        path: ['participants'],
        message: `Shares must add up to exactly ${SHARE_PCT_TOTAL}%`,
      });
    }
    if (value.participants.filter((participant) => participant.isMe).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['participants'],
        message: 'A group transaction must include exactly one participant marked as you',
      });
    }
  });

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const transactionSchemaMatchesType: AssertEqual<
  z.infer<typeof transactionInputSchema>,
  TransactionInput
> = true;
void transactionSchemaMatchesType;
