import { eq } from 'drizzle-orm';
import {
  CHART_KINDS,
  CURRENCIES,
  DEFAULT_SETTINGS,
  LANGUAGES,
  THEMES,
  type ChartKind,
  type ChartPrefs,
  type Settings,
} from '@crypto-tracker/shared';
import { nowIso } from '../lib/time';
import type { Database } from './client';
import { settings, type SettingsRow } from './schema';

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function parseChartPrefs(raw: string): ChartPrefs {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS.chartPrefs;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_SETTINGS.chartPrefs;
  }
  const { lineChart, pieChart, order } = parsed as Record<string, unknown>;
  if (
    typeof lineChart !== 'boolean' ||
    typeof pieChart !== 'boolean' ||
    !Array.isArray(order) ||
    !order.every(
      (kind): kind is ChartKind => typeof kind === 'string' && isOneOf(CHART_KINDS, kind),
    )
  ) {
    return DEFAULT_SETTINGS.chartPrefs;
  }
  return { lineChart, pieChart, order };
}

export function rowToSettings(row: SettingsRow): Settings {
  return {
    language: isOneOf(LANGUAGES, row.language) ? row.language : DEFAULT_SETTINGS.language,
    baseCurrency: isOneOf(CURRENCIES, row.baseCurrency)
      ? row.baseCurrency
      : DEFAULT_SETTINGS.baseCurrency,
    largeText: row.largeText,
    theme: isOneOf(THEMES, row.theme) ? row.theme : DEFAULT_SETTINGS.theme,
    alertsEnabled: row.alertsEnabled,
    chartPrefs: parseChartPrefs(row.chartPrefs),
  };
}

function settingsToRow(userId: string, value: Settings): SettingsRow {
  return {
    userId,
    language: value.language,
    baseCurrency: value.baseCurrency,
    largeText: value.largeText,
    theme: value.theme,
    alertsEnabled: value.alertsEnabled,
    chartPrefs: JSON.stringify(value.chartPrefs),
    updatedAt: nowIso(),
  };
}

export async function getOrCreateSettings(db: Database, userId: string): Promise<Settings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.userId, userId) });
  if (row) return rowToSettings(row);
  await db.insert(settings).values(settingsToRow(userId, DEFAULT_SETTINGS)).onConflictDoNothing();
  return DEFAULT_SETTINGS;
}

export async function saveSettings(
  db: Database,
  userId: string,
  value: Settings,
): Promise<Settings> {
  const { userId: _ignored, ...columns } = settingsToRow(userId, value);
  await db
    .insert(settings)
    .values({ userId, ...columns })
    .onConflictDoUpdate({ target: settings.userId, set: columns });
  return value;
}
