ALTER TABLE "transactions" ADD COLUMN "scope" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "participants" text DEFAULT '[]' NOT NULL;