# Crypto Tracker — Design System

**Version:** 1.0 · 2026-09-16
**Binding for:** every file under `apps/web/src`. Workers read this before touching UI.
**Sources distilled:** `~/.claude/skills/design-taste-frontend`, `~/.claude/skills/high-end-visual-design`, `ui-ux-pro-max` (design-system query "fintech crypto portfolio tracker"), bundled `dataviz` skill (palette validated with its script).

---

## 1. Design read

**Reading this as:** a personal finance app for one non-technical, older, bilingual (English / Arabic RTL) user on a phone and a laptop, with a calm, high-trust, "Soft Structuralism" language: off-white surfaces, one cobalt accent, big tabular numbers, floating panels with soft diffused shadows, no decoration for its own sake.

Dials: `DESIGN_VARIANCE 4` (app, not a landing page; predictable grid) · `MOTION_INTENSITY 4` (fluid CSS transitions, no choreography) · `VISUAL_DENSITY 4` (daily app; generous but not airy).

What "premium" means here: everything aligned to an 8 px rhythm, one radius system, one accent, numbers that never jump, feedback on every tap, skeletons instead of spinners, empty states that tell you what to do next, and nothing on the screen that does not help the user read their portfolio.

## 2. Tokens (CSS variables in `src/index.css`, exposed to Tailwind v4 via `@theme`)

### Color (light) and (dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F6F6F4` | `#0F1013` | page background (off-white / off-black, never pure) |
| `--surface` | `#FFFFFF` | `#17181C` | panels, cards, inputs |
| `--surface-2` | `#F1F1EE` | `#1F2025` | outer shell of double-bezel, hover fills, table header |
| `--ink` | `#1B1C1F` | `#F3F3F1` | primary text |
| `--ink-2` | `#5B5E66` | `#A3A6AE` | secondary text (AA on both surfaces) |
| `--ink-3` | `#8A8D95` | `#6F727A` | tertiary: captions, axis text |
| `--line` | `#E6E6E2` | `#2A2B31` | hairlines (rare; prefer spacing) |
| `--accent` | `#2457D6` | `#5B8DEF` | ONE accent: primary buttons, active nav, focus ring, links |
| `--accent-ink` | `#FFFFFF` | `#0F1013` | text on accent |
| `--accent-soft` | `#E8EEFB` | `#1B2A4A` | accent tint fills (active tab bg, selected row) |
| `--gain` | `#15803D` | `#34C77B` | profit; always paired with a `+` sign or up-arrow icon |
| `--gain-soft` | `#E7F5EC` | `#12301F` | |
| `--loss` | `#DC2626` | `#F26B6B` | loss; always paired with a `-` sign or down-arrow icon |
| `--loss-soft` | `#FDECEC` | `#3A1717` | |
| `--warn` | `#B45309` | `#F2A93B` | alerts triggered / caution |
| `--warn-soft` | `#FDF1DF` | `#3A2A10` | |

Rules: no gradients except chart fills; no glow; shadows tinted to the page hue (`rgb(27 28 31 / 0.06)` light, `rgb(0 0 0 / 0.5)` dark); indigo is gone everywhere (`grep -rn indigo` must be empty).

### Chart palette (validated, light + dark, fixed order, never cycled)
`#2457D6, #0F9D7A, #D97706, #7C3AED, #0891B2, #BE185D`; 7th+ holdings fold into "Other" (`--ink-3`). P/L charts use `--gain` / `--loss` only. Grid lines `--line` at 60 % opacity; axis text `--ink-3` 12 px tabular.

### Radius (one system)
`--r-sm 10px` inputs, chips, list rows · `--r-md 16px` inner panels, dialogs on desktop · `--r-lg 22px` outer shells, bottom sheets · buttons are pills (`9999px`). Concentric: inner radius = outer radius − padding.

### Shadow
`--shadow-panel`: `0 1px 2px rgb(27 28 31 / 0.04), 0 8px 24px -12px rgb(27 28 31 / 0.12)` (light); dark: `0 1px 0 rgb(255 255 255 / 0.04) inset, 0 12px 32px -16px rgb(0 0 0 / 0.6)`. Nothing else; no `shadow-md`.

### Spacing
8 px scale. Page gutter 16 px phone / 32 px desktop. Panel padding 20 px phone / 24 px desktop. Section gap 24 px. Content `max-w-5xl`.

### Motion
Easing `--ease-out: cubic-bezier(0.32, 0.72, 0, 1)`; durations 150 ms (hover/press), 220 ms (state), 320 ms (enter). Press: `active:scale-[0.98]`. Enter: fade + 8 px rise, staggered 40 ms per item for lists (CSS only, `animation-delay: calc(var(--i) * 40ms)`). Everything gated by `prefers-reduced-motion: reduce` → no transform animation, opacity only.

## 3. Typography

- Family: **IBM Plex Sans** (Latin) + **IBM Plex Sans Arabic** (Arabic), self-hosted from `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-sans-arabic` (weights 400, 500, 600, 700). `font-feature-settings: "tnum" 1` on every number. No Inter.
- Scale (mobile / desktop): display `28/34 px` semibold for the hero number; h1 `22/26` semibold; h2 (panel titles) `16/17` semibold; body `16` regular; label `13/14` medium; caption `12/13` regular. Line-height 1.4 body, 1.15 display.
- Large-text mode multiplies the root size (18 px); never hard-code px for text, use `rem`.
- Text color is never the series/accent color; only marks and badges carry color.

## 4. Icons

`@phosphor-icons/react`, weight `regular` for UI at 20 px, `bold` for 16 px inline, `fill` only for the active nav item. One family only; `src/components/icons.tsx` becomes a thin re-export map (`Icon.Home`, `Icon.List`, …) so features never import Phosphor directly. Hand-drawn SVGs are removed. No emoji.

## 5. Components (`src/components/ui`) — the only building blocks features may use

Existing APIs stay backward compatible (same props keep working); new props are additive.

| Component | Spec |
|---|---|
| `Panel` (new; `Card` becomes an alias) | Double-bezel: outer shell `bg-surface-2` + `ring-1 ring-black/5 dark:ring-white/8` + `p-1.5` + `rounded-[var(--r-lg)]`; inner `bg-surface` + `rounded-[calc(var(--r-lg)-6px)]` + `shadow-panel` + padding. Props: `title?`, `subtitle?`, `actions?`, `flush?` (no inner padding, for tables), `tone?: 'default' | 'accent' | 'gain' | 'loss' | 'warn'` (tints the outer shell only). |
| `StatCard` (new) | Label (`label` style, `--ink-2`), value (display size, tabular), optional `delta` (`PnlText` + arrow icon), optional `hint`. Value never wraps; long values shrink with `text-[clamp(...)]`. |
| `Button` | Pill. Variants `primary` (accent), `secondary` (surface-2 + ring), `ghost`, `danger` (loss). Sizes `md` 44 px, `lg` 52 px. Trailing icon sits in its own 28 px circle (`bg-black/5 dark:bg-white/10`) flush to the end padding. Loading → inline spinner, width preserved. |
| `IconButton` (new) | 44 px circle, ghost by default, `aria-label` required. |
| `SegmentedControl` (new) | Pill track (`bg-surface-2`), sliding selected pill (`bg-surface shadow-panel`), 44 px tall; used for Buy/Sell, $ / %, chart ranges, above/below. |
| `Input`, `Textarea`, `Select`, `Field` | 48 px tall, `rounded-[var(--r-sm)]`, `bg-surface`, `ring-1 ring-line`, focus `ring-2 ring-accent`; label above, helper below, error below in `--loss` with icon. `inputMode` set for numbers. Number inputs right-aligned tabular in LTR (start-aligned logically). |
| `Toggle` | 52×32 pill, knob 28 px, accent when on, label on the start side, 48 px row height. |
| `Dialog` | Phone: bottom sheet (`rounded-t-[var(--r-lg)]`, drag handle bar, safe-area padding, slides up 320 ms); desktop: centered 480 px, `rounded-[var(--r-md)]`, backdrop `bg-black/40 backdrop-blur-sm`. Title, optional description, footer with actions end-aligned (primary last). |
| `ListRow` (new) | 56 px min row with leading `Avatar`/icon, title + subtitle, trailing value/badge/chevron; rows separated by 8 px gap or a single hairline, never both borders. Pressable variant has hover `bg-surface-2` and press scale. |
| `Avatar` (new) | Coin thumb or first-letter monogram on `--accent-soft`, 36 / 44 px. |
| `Badge` | Tones `neutral | gain | loss | warn | accent`; 24 px pill, 12 px medium, icon optional. |
| `PnlText` | Color by tone + icon arrow (`ArrowUpRight`/`ArrowDownRight`), never color alone. |
| `Skeleton` (new) | Shimmer blocks matching the final layout (`StatCard.Skeleton`, `ListRow.Skeleton`, chart skeleton). Replaces page-level `Spinner`. `Spinner` stays for buttons only. |
| `EmptyState` | Icon in a 56 px `--accent-soft` circle, title, one sentence, one primary action. |
| `ErrorMessage` | Loss-soft panel with icon, message, retry button. |
| `Toast` (new) | Bottom-center on phone (above tab bar), bottom-end on desktop; auto-dismiss 4 s; `aria-live="polite"`; success/error tones; exposes `useToast()`. |
| `PageHeader` | h1 + optional subtitle + actions; on phone the primary action may render as a full-width pill below the title. |

## 6. Layout

- **Desktop shell:** floating sidebar panel (`Panel`, 256 px, `sticky top-6`, 24 px inset from the window edge, not glued), nav items 48 px with icon + label, active item `--accent-soft` pill with `fill` icon; user block + sign-out in the footer. Content column `max-w-5xl` with 32 px gutter.
- **Phone shell:** bottom tab bar, 5 items, 64 px + safe area, `bg-surface/90 backdrop-blur` (fixed element, blur allowed), active item accent with `fill` icon and a 4 px pill indicator; page has bottom padding for the bar.
- Pages: `PageHeader` → summary → panels stacked with 24 px gaps. Two-column grids only on `md+` and only for equal-weight panels; never three equal cards in a row.
- RTL: logical utilities only (`ms/me/ps/pe/start/end`), icons that imply direction (arrows, chevrons) flip via `rtl:-scale-x-100` or a mirrored icon.

## 7. Pages (what each must feel like)

- **Sign-in:** centered `Panel` with the app mark (Phosphor `ChartLineUp` in an accent circle), one sentence, one full-width Google pill button with the Google mark, language switch as a `SegmentedControl` (EN / العربية). No marketing copy.
- **Dashboard:** hero `StatCard` row: Total value (display), Unrealized P/L (with delta), Invested, Realized P/L (secondary). Then the **P/L chart** (see 8), then Allocation donut + legend as one panel, then Holdings as `ListRow`s (phone) / table (desktop). "Last updated" as a caption under the h1, not a badge.
- **Transactions:** primary pill "Add transaction" in the header; filters as two `Select`s in one row; list of `ListRow`s (coin avatar, symbol + date, quantity, total with Buy/Sell badge). Form in a `Dialog` sheet: Buy/Sell `SegmentedControl` first, coin picker, quantity + price side by side on desktop, currency `Select`, fee, date, note; live total in a `--surface-2` strip above the footer.
- **Prices:** "Your coins" `ListRow`s with `Avatar`, price big tabular, 24 h delta `PnlText`; search panel with `CoinPicker`; watchlist rows with remove `IconButton`.
- **Alerts:** notification-permission panel with a clear status `Badge` and one action; alert `ListRow`s with condition text, current price, status badge, actions in an overflow-safe row.
- **Import:** three-step layout (Prepare, Preview, Done) with a slim step indicator (plain text "1 of 3", no numbered eyebrows); drop-zone as a dashed `--r-md` box; preview rows with loss-soft background for errors.
- **Settings:** grouped `Panel`s (Account, Display, Alerts, Charts); each row is a `ListRow` with the control trailing; sign-out is a `danger`-tone ghost button separated at the bottom.

## 8. P/L chart (replaces the "Portfolio value" snapshot chart)

- Source: `GET /api/portfolio/history?range=` points (`takenAt`, `totalValueUsd`, `investedUsd`). Derived per point: `pnlUsd = totalValueUsd - investedUsd`, `pnlPct = investedUsd > 0 ? pnlUsd / investedUsd * 100 : 0`. No API change.
- Form: single-series **area chart** of P/L over time. Zero line drawn as a solid `--ink-3` hairline. The area above zero fills `--gain` at 18 % opacity with a `--gain` 2 px line; below zero fills `--loss` at 18 % with a `--loss` line. Implement with a Recharts `<defs>` linear gradient whose stop offset is computed from the data domain (`offset = max / (max - min)`), plus `ReferenceLine y={0}`.
- Controls in the panel header: `SegmentedControl` `$ | %` (base currency via `formatMoneyUsd` / `formatPct`) and `SegmentedControl` range `24h | 7d | 30d | 90d | 1y | All`.
- Header stat: current P/L for the range (value + % + delta since range start) as a `StatCard`-style inline block, colored by tone.
- Tooltip: date (`formatDateTime`) + P/L value + %. Crosshair on hover; on touch the last tapped point stays highlighted.
- Fewer than 2 points: skeleton-shaped empty state "Your profit and loss line starts after the first hourly snapshot." Keep the hourly cron unchanged.
- Axis: y ticks tabular, compact (`formatMoneyCompact`), x ticks by range (hours / days / months). Grid lines horizontal only, `--line`.
- Accessible summary `aria-label` on the chart ("Profit and loss over 30 days, currently +5.2 %") and the data also available as a small "Show table" disclosure.
- The old `ValueChart` (portfolio value + invested lines) is deleted; `chartPrefs.lineChart` now means "show P/L chart".

## 9. Anti-slop checklist (worker self-check before reporting)

- Zero em-dashes (`—`, `–`) in any visible string; hyphen only.
- No indigo, no purple glow, no gradients outside chart fills, no `shadow-md`, no pure black/white.
- No hand-drawn SVG icons, no emoji, one icon family.
- No three-equal-cards rows; no card inside card inside card (max: outer shell + inner core + content).
- No page-level spinners (skeletons); no toast for errors that belong inline.
- Every interactive element ≥ 44 px, `cursor-pointer`, visible focus ring, press feedback.
- Numbers tabular; money via `formatFiat` / `formatMoneyUsd`; percentages signed.
- All strings via i18n (en + ar); Arabic renders in IBM Plex Sans Arabic and mirrors correctly.
- Light and dark both checked; large-text mode checked at 390 px.
