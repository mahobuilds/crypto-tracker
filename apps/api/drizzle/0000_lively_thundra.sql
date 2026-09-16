CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"coin_id" text NOT NULL,
	"coin_symbol" text NOT NULL,
	"coin_name" text NOT NULL,
	"target_price_usd" double precision NOT NULL,
	"direction" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"triggered_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"taken_at" text NOT NULL,
	"total_value_usd" double precision NOT NULL,
	"invested_usd" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"large_text" boolean DEFAULT false NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"alerts_enabled" boolean DEFAULT false NOT NULL,
	"chart_prefs" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"coin_id" text NOT NULL,
	"coin_symbol" text NOT NULL,
	"coin_name" text NOT NULL,
	"quantity" double precision NOT NULL,
	"price_per_unit" double precision NOT NULL,
	"currency" text NOT NULL,
	"price_per_unit_usd" double precision NOT NULL,
	"fee" double precision DEFAULT 0 NOT NULL,
	"fee_usd" double precision DEFAULT 0 NOT NULL,
	"occurred_at" text NOT NULL,
	"note" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "alerts_user_id_idx" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_user_id_taken_at_idx" ON "portfolio_snapshots" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "transactions_user_id_occurred_at_idx" ON "transactions" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transactions_user_id_coin_id_idx" ON "transactions" USING btree ("user_id","coin_id");