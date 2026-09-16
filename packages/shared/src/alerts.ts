import { z } from 'zod';
import { ALERT_DIRECTIONS } from './constants';
import { coinIdSchema, coinNameSchema, coinSymbolSchema } from './transactions';
import type { AlertInput } from './types';

export const alertInputSchema = z.object({
  coinId: coinIdSchema,
  coinSymbol: coinSymbolSchema,
  coinName: coinNameSchema,
  targetPriceUsd: z.number().finite().positive(),
  direction: z.enum(ALERT_DIRECTIONS),
  enabled: z.boolean().default(true),
});

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const alertSchemaMatchesType: AssertEqual<z.infer<typeof alertInputSchema>, AlertInput> = true;
void alertSchemaMatchesType;
