CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "portfolio_snapshots" ADD COLUMN "wallet_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "wallet_id" text;--> statement-breakpoint
-- Every user who already has transactions gets one "Main wallet" holding all of them,
-- so existing data keeps working once wallet_id becomes required.
INSERT INTO "wallets" ("id", "user_id", "name", "created_at", "updated_at")
SELECT
	gen_random_uuid()::text,
	"user_id",
	'Main wallet',
	to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
FROM (SELECT DISTINCT "user_id" FROM "transactions") AS "users";--> statement-breakpoint
UPDATE "transactions" AS "t"
SET "wallet_id" = "w"."id"
FROM "wallets" AS "w"
WHERE "w"."user_id" = "t"."user_id" AND "t"."wallet_id" IS NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "wallet_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_user_id_wallet_id_taken_at_idx" ON "portfolio_snapshots" USING btree ("user_id","wallet_id","taken_at");--> statement-breakpoint
CREATE INDEX "transactions_user_id_wallet_id_idx" ON "transactions" USING btree ("user_id","wallet_id");--> statement-breakpoint
CREATE POLICY "wallets_own_rows" ON "wallets" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text);
