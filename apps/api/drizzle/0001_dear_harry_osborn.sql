ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "portfolio_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "alerts_own_rows" ON "alerts" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "portfolio_snapshots_own_rows" ON "portfolio_snapshots" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "push_subscriptions_own_rows" ON "push_subscriptions" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "settings_own_rows" ON "settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "transactions_own_rows" ON "transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text);