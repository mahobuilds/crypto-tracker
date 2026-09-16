import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Better Auth tables (mirror the built-in schema of @better-auth/core)
// ---------------------------------------------------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

// ---------------------------------------------------------------------------
// App tables (timestamps are ISO-8601 text, ids come from newId())
// ---------------------------------------------------------------------------

export const settings = sqliteTable('settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  language: text('language').notNull().default('en'),
  baseCurrency: text('base_currency').notNull().default('USD'),
  largeText: integer('large_text', { mode: 'boolean' }).notNull().default(false),
  theme: text('theme').notNull().default('system'),
  alertsEnabled: integer('alerts_enabled', { mode: 'boolean' }).notNull().default(false),
  /** JSON-serialized `ChartPrefs`. */
  chartPrefs: text('chart_prefs').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    coinId: text('coin_id').notNull(),
    coinSymbol: text('coin_symbol').notNull(),
    coinName: text('coin_name').notNull(),
    quantity: real('quantity').notNull(),
    pricePerUnit: real('price_per_unit').notNull(),
    currency: text('currency').notNull(),
    pricePerUnitUsd: real('price_per_unit_usd').notNull(),
    fee: real('fee').notNull().default(0),
    feeUsd: real('fee_usd').notNull().default(0),
    occurredAt: text('occurred_at').notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('transactions_user_id_occurred_at_idx').on(t.userId, t.occurredAt),
    index('transactions_user_id_coin_id_idx').on(t.userId, t.coinId),
  ],
);

export const alerts = sqliteTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    coinId: text('coin_id').notNull(),
    coinSymbol: text('coin_symbol').notNull(),
    coinName: text('coin_name').notNull(),
    targetPriceUsd: real('target_price_usd').notNull(),
    direction: text('direction').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    triggeredAt: text('triggered_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('alerts_user_id_idx').on(t.userId)],
);

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: text('created_at').notNull(),
});

export const portfolioSnapshots = sqliteTable(
  'portfolio_snapshots',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    takenAt: text('taken_at').notNull(),
    totalValueUsd: real('total_value_usd').notNull(),
    investedUsd: real('invested_usd').notNull(),
  },
  (t) => [index('portfolio_snapshots_user_id_taken_at_idx').on(t.userId, t.takenAt)],
);

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type AlertRow = typeof alerts.$inferSelect;
export type NewAlertRow = typeof alerts.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
export type PortfolioSnapshotRow = typeof portfolioSnapshots.$inferSelect;
export type NewPortfolioSnapshotRow = typeof portfolioSnapshots.$inferInsert;
