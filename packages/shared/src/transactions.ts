import { z } from 'zod';
import { CURRENCIES, TRANSACTION_TYPES } from './constants';
import type { TransactionInput } from './types';

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

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  coinId: coinIdSchema,
  coinSymbol: coinSymbolSchema,
  coinName: coinNameSchema,
  quantity: z.number().finite().positive(),
  pricePerUnit: z.number().finite().nonnegative(),
  currency: z.enum(CURRENCIES),
  fee: z.number().finite().nonnegative().default(0),
  occurredAt: occurredAtSchema,
  note: noteSchema,
});

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const transactionSchemaMatchesType: AssertEqual<
  z.infer<typeof transactionInputSchema>,
  TransactionInput
> = true;
void transactionSchemaMatchesType;
