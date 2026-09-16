import { and, asc, count, eq } from 'drizzle-orm';
import { ALERT_DIRECTIONS, type Alert, type AlertInput } from '@crypto-tracker/shared';
import type { Database } from '../db/client';
import { alerts, type AlertRow } from '../db/schema';
import { ApiError } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';

export const MAX_ALERTS_PER_USER = 50;

function toDirection(value: string): Alert['direction'] {
  return (ALERT_DIRECTIONS as readonly string[]).includes(value)
    ? (value as Alert['direction'])
    : 'above';
}

export function rowToAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    coinId: row.coinId,
    coinSymbol: row.coinSymbol,
    coinName: row.coinName,
    targetPriceUsd: row.targetPriceUsd,
    direction: toDirection(row.direction),
    enabled: row.enabled,
    triggeredAt: row.triggeredAt,
    createdAt: row.createdAt,
  };
}

/** `above` fires once the price reaches or exceeds the target; `below` once it reaches or drops under it. */
export function isTriggered(
  alert: Pick<Alert, 'direction' | 'targetPriceUsd'>,
  priceUsd: number,
): boolean {
  return alert.direction === 'above'
    ? priceUsd >= alert.targetPriceUsd
    : priceUsd <= alert.targetPriceUsd;
}

/** Up to 2 decimals for prices of at least $1, up to 6 decimals below that. */
export function formatAlertPrice(value: number): string {
  const decimals = Math.abs(value) >= 1 ? 2 : 6;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export interface AlertNotification {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Text of the push notification sent when an alert fires. */
export function buildAlertNotification(
  alert: Pick<Alert, 'id' | 'coinSymbol' | 'direction' | 'targetPriceUsd'>,
  priceUsd: number,
): AlertNotification {
  const sign = alert.direction === 'above' ? '≥' : '≤';
  return {
    title: `${alert.coinSymbol} ${sign} $${formatAlertPrice(alert.targetPriceUsd)}`,
    body: `Now $${formatAlertPrice(priceUsd)}`,
    url: '/alerts',
    tag: alert.id,
  };
}

export async function listAlerts(db: Database, userId: string): Promise<Alert[]> {
  const rows = await db.query.alerts.findMany({
    where: eq(alerts.userId, userId),
    orderBy: [asc(alerts.createdAt)],
  });
  return rows.map(rowToAlert);
}

async function countAlerts(db: Database, userId: string): Promise<number> {
  const [row] = await db.select({ value: count() }).from(alerts).where(eq(alerts.userId, userId));
  return row?.value ?? 0;
}

export async function createAlert(db: Database, userId: string, input: AlertInput): Promise<Alert> {
  if ((await countAlerts(db, userId)) >= MAX_ALERTS_PER_USER) {
    throw new ApiError(400, 'LIMIT_REACHED', `You can have at most ${MAX_ALERTS_PER_USER} alerts`);
  }
  const row: AlertRow = {
    id: newId(),
    userId,
    coinId: input.coinId,
    coinSymbol: input.coinSymbol,
    coinName: input.coinName,
    targetPriceUsd: input.targetPriceUsd,
    direction: input.direction,
    enabled: input.enabled,
    triggeredAt: null,
    createdAt: nowIso(),
  };
  await db.insert(alerts).values(row);
  return rowToAlert(row);
}

async function getAlertRow(db: Database, userId: string, id: string): Promise<AlertRow> {
  const row = await db.query.alerts.findFirst({
    where: and(eq(alerts.id, id), eq(alerts.userId, userId)),
  });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Alert not found');
  return row;
}

/** Updates an alert; saving it while enabled re-arms it (clears `triggeredAt`). */
export async function updateAlert(
  db: Database,
  userId: string,
  id: string,
  input: AlertInput,
): Promise<Alert> {
  const existing = await getAlertRow(db, userId, id);
  const changes = {
    coinId: input.coinId,
    coinSymbol: input.coinSymbol,
    coinName: input.coinName,
    targetPriceUsd: input.targetPriceUsd,
    direction: input.direction,
    enabled: input.enabled,
    triggeredAt: input.enabled ? null : existing.triggeredAt,
  };
  await db
    .update(alerts)
    .set(changes)
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  return rowToAlert({ ...existing, ...changes });
}

export async function deleteAlert(db: Database, userId: string, id: string): Promise<void> {
  await getAlertRow(db, userId, id);
  await db.delete(alerts).where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
}
