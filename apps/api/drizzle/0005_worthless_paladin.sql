ALTER TABLE "wallets" ADD COLUMN "scope" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "participants" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- Splits now live on the wallet. A wallet whose trades are all group trades with the same
-- people and shares becomes a group wallet with that split; every other wallet stays solo,
-- and its older trades keep the split they were recorded with until the wallet's split is
-- changed or the trade moves to another wallet.
UPDATE "wallets" AS "w"
SET "scope" = 'group', "participants" = "s"."participants"
FROM (
	SELECT "wallet_id", min("participants") AS "participants"
	FROM "transactions"
	GROUP BY "wallet_id"
	HAVING bool_and("scope" = 'group') AND count(DISTINCT "participants") = 1
) AS "s"
WHERE "s"."wallet_id" = "w"."id";
