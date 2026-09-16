# Task U0: Design foundation — tokens, fonts, icons, UI kit, app shell, sign-in

## Goal

Rebuild the visual foundation of the web app to `docs/DESIGN.md` so that every feature page in the next wave can be restyled by composing the new components. When you are done: the app uses the design tokens, IBM Plex Sans (+ Arabic), Phosphor icons, the double-bezel `Panel`, pill buttons, segmented controls, skeletons, toasts, a floating desktop sidebar and a blurred bottom tab bar; the sign-in page and the app shell look finished; and every existing feature page still compiles and works because component APIs stayed backward compatible.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Read first, in this order:
  1. `docs/DESIGN.md` (binding: tokens, typography, icons, component specs, layout, anti-slop checklist).
  2. `~/.claude/skills/high-end-visual-design/SKILL.md` sections 4 (double-bezel, nested CTA icon) and 5 (motion easing); `~/.claude/skills/design-taste-frontend/SKILL.md` sections 4.4, 4.5, 4.6, 9.A, 9.G (materiality, states, forms, AI tells, em-dash ban).
  3. Current code: `apps/web/src/index.css`, `src/components/ui/*`, `src/components/icons.tsx`, `src/components/CoinPicker.tsx`, `src/app/layout/AppShell.tsx`, `src/app/nav.ts`, `src/app/auth/SignInPage.tsx`, `src/app/auth/AuthGate.tsx`, `src/app/settings/SettingsProvider.tsx`, `src/app/NotFoundPage.tsx`, `src/lib/format.ts`, `src/lib/cn.ts`, `src/main.tsx`, `src/i18n/index.ts`, `src/i18n/en/common.json`.
  4. Every file under `src/features/**` — read-only — to learn which component props are in use so you do not break them.
- Installed (do not install anything): `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-sans-arabic`, `@phosphor-icons/react` (read `node_modules/@phosphor-icons/react/dist/index.d.ts` for names and the `weight` prop), Tailwind v4, react-router 7, TanStack Query 5, recharts (not yours).
- Contracts you provide: every component and prop named in DESIGN.md section 5, exported from `src/components/ui/index.ts`; `src/components/icons.tsx` exporting an `Icon` namespace object (`Icon.Home`, `Icon.List`, `Icon.ChartLine`, `Icon.Bell`, `Icon.Gear`, `Icon.Upload`, `Icon.Plus`, `Icon.Trash`, `Icon.Pencil`, `Icon.MagnifyingGlass`, `Icon.X`, `Icon.CaretRight`, `Icon.CaretDown`, `Icon.SignOut`, `Icon.ArrowUpRight`, `Icon.ArrowDownRight`, `Icon.Check`, `Icon.Warning`, `Icon.Info`, `Icon.Google` (inline brand mark is the ONE allowed SVG), `Icon.Coins`, `Icon.Sparkle`, `Icon.Clock`, `Icon.FileCsv`, `Icon.BellRinging`, `Icon.Moon`, `Icon.Sun`, `Icon.TextAa`, `Icon.Translate`, `Icon.DotsThree`, `Icon.Funnel`, `Icon.ArrowsClockwise`) each accepting `{ className?, weight?, size? }`; `useToast()` from `src/components/ui`.

## Parallel work warning

Nobody else edits `apps/web` during this task. Feature folders (`src/features/**`) are NOT yours: do not restyle them; only change them if a component API you changed would break them (prefer keeping the API). No installs.

## Files you own

- `apps/web/src/index.css`, `apps/web/src/main.tsx`
- `apps/web/src/components/**` (ui kit, icons, CoinPicker)
- `apps/web/src/app/**` (shell, nav, sign-in, auth gate, settings provider loading states, NotFoundPage, routes.tsx only if a provider must be added)
- `apps/web/src/lib/format.ts` (add `formatMoneyCompact`, `formatSignedMoneyUsd` if missing; keep existing exports)
- `apps/web/src/i18n/en/common.json`, `ar/common.json`, `en/nav.json`, `ar/nav.json`, `en/auth.json`, `ar/auth.json` (add keys; keep existing)
- `apps/web/index.html` (font preload not needed with fontsource; adjust `theme-color` to the new accent)

## Steps

1. **Tokens.** Rewrite `index.css`: import the four font weights for both families from `@fontsource/...`; define the tokens from DESIGN.md section 2 as CSS variables on `:root` and `.dark`; expose them to Tailwind with `@theme inline { --color-bg: var(--bg); --color-surface: ...; --font-sans: 'IBM Plex Sans', 'IBM Plex Sans Arabic', system-ui, sans-serif; --radius-sm/md/lg; --shadow-panel; --ease-out }` so utilities like `bg-surface`, `text-ink-2`, `rounded-lg`, `shadow-panel` work. Keep `@custom-variant dark`, the large-text rule, `touch-target`, focus-visible ring (accent, 2 px, offset 2). Add `html { font-feature-settings: "tnum" 1 }`? No: apply `tnum` through a `.tabular` utility and on `StatCard`/`PnlText`/number inputs, plus `font-variant-numeric: tabular-nums` on `body` is acceptable (numbers everywhere are data). Body bg `--bg`, text `--ink`. `[lang="ar"]` sets the Arabic family first. Reduced-motion block.
2. **Icons.** Replace `icons.tsx` with the Phosphor re-export map (default `weight="regular"`, size 20). Update every import site in `src/app/**` and `src/components/**`. Feature folders import `@/components/icons` names that exist today (`HomeIcon`, `ListIcon`, ...): keep those names as aliases to the new map so features compile unchanged.
3. **UI kit.** Implement/restyle every component in DESIGN.md section 5. Keep existing props working (`Button` variants/sizes/loading/fullWidth, `Card`, `Field`, `Input`, `Select` `options`, `Textarea`, `Toggle`, `Dialog` `open/onClose/title/footer`, `PageHeader` `title/subtitle/actions`, `EmptyState`, `Spinner`, `ErrorMessage`, `Badge` tones (map old `positive/negative/info` to new `gain/loss/accent` and keep the old names accepted), `PnlText`). Add `Panel`, `StatCard` (+ `StatCard.Skeleton`), `IconButton`, `SegmentedControl` (`options: { value, label, icon? }[]`, `value`, `onChange`, `size?`, `fullWidth?`, animated sliding pill via CSS transform, keyboard arrows), `ListRow` (+ `ListRow.Skeleton`), `Avatar`, `Skeleton`, `Toast` + `ToastProvider` + `useToast`. `Dialog`: bottom sheet on `< md` with drag handle and slide-up animation, centered on `md+`, body scroll lock, Escape/backdrop close, focus trap (first focusable), `aria-labelledby`.
4. **Shell.** `AppShell`: floating sidebar `Panel` on `md+` per DESIGN.md 6; bottom tab bar on phone with blur, 4 px active pill, `fill` icon when active; `AlertBanner` slot stays where it is. `nav.ts` uses the `Icon` map. Mount `ToastProvider` once (in `App.tsx` or `routes.tsx`).
5. **Sign-in + gates.** `SignInPage` per DESIGN.md 7; `AuthGate` pending state → a centered app mark with a subtle pulse (not a spinner); `SettingsProvider` loading → page skeleton (header + 3 stat skeletons); errors → `ErrorMessage`. `NotFoundPage` → `EmptyState`.
6. **CoinPicker.** Restyle with `Input` + result `ListRow`s (Avatar thumb, name, symbol badge) in a floating `Panel` popover; selected chip uses `Avatar` + `IconButton` clear. Same props.
7. **Format helpers.** `formatMoneyCompact(amountUsd, currency, fx, language)` (`notation: 'compact'`), `formatSignedMoneyUsd(...)` (prefix `+`/`-`).
8. **Verify visually.** Run `pnpm --filter @crypto-tracker/api dev` (port 8787; uses the real Supabase `.env`) and `pnpm --filter @crypto-tracker/web dev` (5173) in the background. Signing in needs Google, so verify the signed-out surfaces in the browser with `playwright-cli`: sign-in page at 390 px and 1366 px, light and dark (`playwright-cli eval "document.documentElement.classList.add('dark')"`), Arabic (`localStorage crypto-tracker.language=ar` then reload). Screenshot each to `C:\Users\medoh\.claude\jobs\b0c28e4f\tmp\u0-*.png`. For the shell and components, build a temporary route? No: instead render a throwaway preview at `src/app/DevKitchenSink.tsx` mounted at `/__kit` **only when `import.meta.env.DEV`**, showing every component in every state; screenshot it at both widths and both themes; keep the file (it is useful) but ensure it is tree-shaken out of production (`if (import.meta.env.DEV)` around the route registration).
9. Stop the servers. Run the verification commands.

## Constraints

- No commits, pushes, installs. No `any`, no TODOs, no hand-drawn SVG except the Google mark, no emoji, zero em-dashes, no indigo/purple, no gradients outside chart code, no `shadow-md`.
- Logical Tailwind utilities only. All strings through i18n (en + ar).
- Backward compatibility of component props is a hard requirement: `pnpm --filter @crypto-tracker/web typecheck` must pass with the feature folders untouched.

## Acceptance criteria

- [ ] `pnpm --filter @crypto-tracker/web typecheck` and `build` exit 0; `pnpm exec prettier --check apps/web` exits 0.
- [ ] `grep -rniE "indigo|—|–" apps/web/src` returns nothing (dash check on `.tsx`/`.ts`/`.json` only).
- [ ] `grep -rnE "<svg" apps/web/src` returns only the Google mark in `icons.tsx` (and `public/` files are not counted).
- [ ] `grep -rnE "\b(ml|mr|pl|pr|left|right)-[0-9]" apps/web/src` returns nothing.
- [ ] Screenshots listed in the report: sign-in (phone/desktop × light/dark, plus Arabic phone), kitchen sink (phone/desktop × light/dark).
- [ ] en/ar key sets identical for the files you touched.

## Verification commands to run before reporting

```
pnpm --filter @crypto-tracker/web typecheck
pnpm --filter @crypto-tracker/web build
pnpm exec prettier --check apps/web
git status --short apps/web
```

## Report

Format from your agent instructions. List every new component export and the screenshot paths.
