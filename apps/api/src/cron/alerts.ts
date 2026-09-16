import { and, eq, isNull } from 'drizzle-orm';
import { CRON } from '@crypto-tracker/shared';
import type { PriceProvider } from '../contracts';
import { createDb, type Database } from '../db/client';
import { alerts, pushSubscriptions, settings, type AlertRow } from '../db/schema';
import { nowIso } from '../lib/time';
import { buildAlertNotification, isTriggered, rowToAlert } from '../services/alerts';
import { listSubscriptions, sendPush, type PushResult } from '../services/push';
import type { CronJob } from './index';

/** Enabled, not yet triggered alerts of users who have alerts switched on in settings. */
async function loadArmedAlerts(db: Database): Promise<AlertRow[]> {
  const rows = await db
    .select({ alert: alerts })
    .from(alerts)
    .innerJoin(settings, eq(settings.userId, alerts.userId))
    .where(
      and(eq(alerts.enabled, true), isNull(alerts.triggeredAt), eq(settings.alertsEnabled, true)),
    );
  return rows.map((row) => row.alert);
}

export function createAlertCheckJob(deps: { prices: PriceProvider }): CronJob {
  return {
    name: 'alert-check',
    cron: CRON.EVERY_MINUTE,
    async run(env) {
      const db = createDb(env);
      const armed = await loadArmedAlerts(db);
      const counts: Record<PushResult, number> = { sent: 0, gone: 0, failed: 0 };
      let triggered = 0;

      if (armed.length > 0) {
        const coinIds = [...new Set(armed.map((row) => row.coinId))];
        const { prices } = await deps.prices.getPrices(env, coinIds);

        for (const row of armed) {
          const quote = prices[row.coinId];
          if (!quote) continue;
          const alert = rowToAlert(row);
          if (!isTriggered(alert, quote.usd)) continue;
          try {
            await db
              .update(alerts)
              .set({ triggeredAt: nowIso(), enabled: false })
              .where(eq(alerts.id, alert.id));
            triggered += 1;

            const notification = buildAlertNotification(alert, quote.usd);
            for (const sub of await listSubscriptions(db, row.userId)) {
              const result = await sendPush(env, sub, notification);
              counts[result] += 1;
              if (result === 'gone') {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
              }
            }
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            console.error(`[alert-check] alert ${alert.id} failed: ${reason}`);
          }
        }
      }

      console.log(
        `[alert-check] alerts checked: ${armed.length}, triggered: ${triggered}, pushes: sent ${counts.sent}/gone ${counts.gone}/failed ${counts.failed}`,
      );
    },
  };
}
