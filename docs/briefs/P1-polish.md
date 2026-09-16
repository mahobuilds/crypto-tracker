# Task P1: Polish — PWA icons, layout fixes found in QA, states audit, large-text and dark-mode check

## Goal

Make the integrated app feel finished on a phone and a laptop: real PNG icons for install, fix the layout defects the master found during the browser walk-through, make every page's loading/empty/error states consistent, and verify large-text and dark mode do not break anything.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- The whole app now runs. To see it: in one terminal `pnpm --filter @crypto-tracker/api dev` (wrangler on 8787), in another `pnpm --filter @crypto-tracker/web dev` (Vite on 5173). A signed-in session without Google: from `apps/api` run `node scripts/seed-dev-session.mjs`, which prints a cookie; set it in the browser (DevTools → Application → Cookies, or Playwright `cookie-set`). The `playwright-cli` command is installed globally; use `playwright-cli open --mobile http://localhost:5173/`, `cookie-set better-auth.session_token "<value>" --domain=localhost --httpOnly`, then `goto`, `screenshot`, `snapshot`. Close the browser with `playwright-cli close` when done.
- Read first: `docs/WORK_PLAN.md` (sections 1, 2.5), `apps/web/src/components/ui/index.ts`, `apps/web/src/index.css`, `apps/web/vite.config.ts`, `apps/web/src/app/layout/AppShell.tsx`, and the feature folder of every defect below before editing it.
- Design rules: logical Tailwind utilities only; touch targets; i18n keys for every string (English in `en/*.json`, Arabic in `ar/*.json` — you may add keys to both, keep key sets identical); no new dependencies.

## Parallel work warning

One other worker (P2) is editing `apps/web/src/i18n/ar/*.json` right now. You may **add** new keys to `ar/*.json` (append, with a correct Arabic value) but must not rewrite existing Arabic values. Re-read an `ar/*.json` file immediately before every edit. Nobody else is touching code. No installs. Do not run `wrangler dev` on a port other than 8787 if it is already running; reuse it.

## Files you own

- `apps/web/**` except `apps/web/package.json` (and the Arabic constraint above)
- `README.md` (one section addition, see step 6)

## Steps

1. **PWA icons.** Produce `public/icons/icon-192.png`, `public/icons/icon-512.png`, and `public/icons/icon-maskable-512.png` (maskable has ~20% safe padding) rendered from the existing `public/icons/icon.svg`. Use a small Node script with no new dependencies if possible (for example draw with the `canvas`-free approach: write the PNG via a tiny hand-rolled encoder is NOT expected — instead use `playwright-cli` to render the SVG at the needed sizes: `playwright-cli open`, `goto file:///.../icon.svg`, `resize 512 512`, `screenshot --filename=...`; verify pixel size with `node -e` reading the PNG header). Update the `manifest.icons` in `vite.config.ts` to list the three PNGs (keep the SVG entry) and add an `apple-touch-icon` link in `index.html` pointing at the 192 PNG.
2. **Defects found in QA (fix each):**
   - Alerts page, phone width: in each alert card the action buttons (re-arm / edit / delete) overlap the status badge and the "≥ $1,000" line. Restructure the card: header row (coin symbol + name, status badge), body rows (condition, current price), footer row of actions with `flex-wrap` and gap.
   - Alerts page: the "Turn on" push button renders even when push is unsupported. Disable it (and say why) when `isPushSupported()` is false; hide it when permission is `denied` and show an explanatory line instead.
   - Alerts page: delete uses `window.confirm`. Replace with the shared `Dialog` and a danger `Button`, matching `features/transactions/DeleteTransactionDialog.tsx`.
   - Prices page: holdings rows show a generic icon because `Holding` has no thumb. Render a circular avatar with the first letter of the symbol instead of the generic glyph.
   - Transactions page: the coin filter dropdown only lists coins from the currently filtered list, so choosing a coin removes the others. Build the coin options from an unfiltered `useTransactions({})` query (cached; the list query already exists) and keep the filtered query for the rows.
   - Alert banner: after dismiss, it must stay hidden across reloads for those alerts (verify the `lastSeen` logic; fix if the banner returns).
3. **States audit.** For every page (dashboard, transactions, prices, alerts, import, settings): loading shows `Spinner` in a consistent position; API errors show `ErrorMessage` with retry; empty data shows `EmptyState` with one action. Make the pattern identical across pages. Check with the seeded user (has data) and with a second seeded user (edit `scripts/seed-dev-session.mjs`? No — instead delete the dev user's transactions and alerts through the UI or via `curl DELETE` to see empty states, then re-add one transaction so the next worker still has data).
4. **Large text + dark mode.** Toggle both in Settings and walk every page at 390 px and 1366 px widths. Fix overflow, clipped text, unreadable contrast, or controls under 48 px. Chart axis text and tooltips must be readable in dark mode.
5. **Manifest/SW sanity.** `pnpm --filter @crypto-tracker/web build`, then `pnpm --filter @crypto-tracker/api dev` serves `apps/web/dist` at `http://localhost:8787/`: confirm `manifest.webmanifest` lists the PNG icons and `sw.js` is served with 200.
6. **README.** Add a short "Local development without Google sign-in" subsection describing `node scripts/seed-dev-session.mjs` and how to use the printed cookie.

## Constraints

- No commits, pushes, installs, new dependencies.
- Do not change API code. If a defect needs an API change, report it under Open issues.
- Keep changes focused; do not restyle pages that are not defective.

## Acceptance criteria

- [ ] `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm format:check` (root) all exit 0.
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src` returns nothing.
- [ ] Three PNG icons exist with the exact pixel sizes; manifest lists them.
- [ ] Every defect in step 2 is fixed and you attach one screenshot path per fix (save under `C:\Users\medoh\.claude\jobs\b0c28e4f\tmp\p1-*.png`).
- [ ] en/ar key sets identical for every i18n file (`node -e` check across all files).

## Verification commands to run before reporting

```
pnpm typecheck
pnpm build
pnpm test
pnpm format:check
git status --short
```

## Report

Format from your agent instructions. Include the screenshot paths.
