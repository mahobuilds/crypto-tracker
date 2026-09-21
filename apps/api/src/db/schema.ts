import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { authUid, authenticatedRole } from 'drizzle-orm/supabase';

// ---------------------------------------------------------------------------
// App tables. Users live in Supabase Auth (`auth.users`); `user_id` stores that
// uuid as text with no cross-schema foreign key. Timestamps are ISO-8601 text,
// ids come from newId().
//
// Row Level Security is enabled on every table. The API connects as the table
// owner (`postgres`), which bypasses RLS, so the policies only matter for direct
// access through Supabase's REST/Realtime with the anon or authenticated keys:
// anon gets nothing, a signed-in user gets only rows where user_id = auth.uid().
// ---------------------------------------------------------------------------

/** Standard per-user RLS policy: a signed-in user may only touch their own rows. */
function ownRowsPolicy(table: string, userIdColumn: string) {
  return pgPolicy(`${table}_own_rows`, {
    for: 'all',
    to: authenticatedRole,
    using: sql`${sql.raw(userIdColumn)} = ${authUid}::text`,
    withCheck: sql`${sql.raw(userIdColumn)} = ${authUid}::text`,
  });
}

export const settings = pgTable(
  'settings',
  {
    userId: text('user_id').primaryKey(),
    language: text('language').notNull().default('en'),
    baseCurrency: text('base_currency').notNull().default('USD'),
    largeText: boolean('large_text').notNull().default(false),
    theme: text('theme').notNull().default('system'),
    alertsEnabled: boolean('alerts_enabled').notNull().default(false),
    /** JSON-serialized `ChartPrefs`. */
    chartPrefs: text('chart_prefs').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  () => [ownRowsPolicy('settings', 'user_id')],
).enableRLS();

export const wallets = pgTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('wallets_user_id_idx').on(t.userId), ownRowsPolicy('wallets', 'user_id')],
).enableRLS();

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    /** 'personal' | 'group'. */
    scope: text('scope').notNull().default('personal'),
    /** JSON-serialized `TransactionParticipant[]`; `[]` for personal trades. */
    participants: text('participants').notNull().default('[]'),
    /** The wallet this trade sits in (`wallets.id`, same user). */
    walletId: text('wallet_id').notNull(),
    coinId: text('coin_id').notNull(),
    coinSymbol: text('coin_symbol').notNull(),
    coinName: text('coin_name').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    pricePerUnit: doublePrecision('price_per_unit').notNull(),
    currency: text('currency').notNull(),
    pricePerUnitUsd: doublePrecision('price_per_unit_usd').notNull(),
    fee: doublePrecision('fee').notNull().default(0),
    feeUsd: doublePrecision('fee_usd').notNull().default(0),
    occurredAt: text('occurred_at').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('transactions_user_id_occurred_at_idx').on(t.userId, t.occurredAt),
    index('transactions_user_id_coin_id_idx').on(t.userId, t.coinId),
    index('transactions_user_id_wallet_id_idx').on(t.userId, t.walletId),
    ownRowsPolicy('transactions', 'user_id'),
  ],
).enableRLS();

export const alerts = pgTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    coinId: text('coin_id').notNull(),
    coinSymbol: text('coin_symbol').notNull(),
    coinName: text('coin_name').notNull(),
    targetPriceUsd: doublePrecision('target_price_usd').notNull(),
    direction: text('direction').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    triggeredAt: text('triggered_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('alerts_user_id_idx').on(t.userId), ownRowsPolicy('alerts', 'user_id')],
).enableRLS();

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('push_subscriptions_endpoint_unique').on(t.endpoint),
    ownRowsPolicy('push_subscriptions', 'user_id'),
  ],
).enableRLS();

export const portfolioSnapshots = pgTable(
  'portfolio_snapshots',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    /** Null for the whole portfolio; set for the snapshot of one wallet. */
    walletId: text('wallet_id'),
    takenAt: text('taken_at').notNull(),
    totalValueUsd: doublePrecision('total_value_usd').notNull(),
    investedUsd: doublePrecision('invested_usd').notNull(),
    /** Owner's-share figures; null on rows written before group trades existed. */
    ownTotalValueUsd: doublePrecision('own_total_value_usd'),
    ownInvestedUsd: doublePrecision('own_invested_usd'),
  },
  (t) => [
    index('portfolio_snapshots_user_id_taken_at_idx').on(t.userId, t.takenAt),
    index('portfolio_snapshots_user_id_wallet_id_taken_at_idx').on(t.userId, t.walletId, t.takenAt),
    ownRowsPolicy('portfolio_snapshots', 'user_id'),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;
export type WalletRow = typeof wallets.$inferSelect;
export type NewWalletRow = typeof wallets.$inferInsert;
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type AlertRow = typeof alerts.$inferSelect;
export type NewAlertRow = typeof alerts.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
export type PortfolioSnapshotRow = typeof portfolioSnapshots.$inferSelect;
export type NewPortfolioSnapshotRow = typeof portfolioSnapshots.$inferInsert;
