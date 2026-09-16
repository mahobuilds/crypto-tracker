import { z } from 'zod';
import { CHART_KINDS, CURRENCIES, LANGUAGES, THEMES } from './constants';
import type { Settings } from './types';

export const chartPrefsSchema = z.object({
  lineChart: z.boolean(),
  pieChart: z.boolean(),
  order: z.array(z.enum(CHART_KINDS)),
});

export const settingsSchema = z.object({
  language: z.enum(LANGUAGES),
  baseCurrency: z.enum(CURRENCIES),
  largeText: z.boolean(),
  theme: z.enum(THEMES),
  alertsEnabled: z.boolean(),
  chartPrefs: chartPrefsSchema,
});

export const settingsUpdateSchema = settingsSchema.partial();

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

/** Compile-time proof that the schema output and the shared `Settings` type are interchangeable. */
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const settingsSchemaMatchesType: AssertEqual<z.infer<typeof settingsSchema>, Settings> = true;
void settingsSchemaMatchesType;
