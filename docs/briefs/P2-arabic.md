# Task P2: Arabic translation quality pass

## Goal

Every Arabic string in the app reads naturally to a native speaker, uses consistent terminology, and matches the English meaning exactly. The primary user is an older Arabic-speaking man using the app on his phone, so wording should be plain and respectful, not technical slang.

## Context

- Project root: `C:\Users\medoh\Documents\crypto-tracker`
- Files: `apps/web/src/i18n/ar/*.json` (ten files) with their English counterparts in `apps/web/src/i18n/en/*.json`. The loader namespaces each file by its filename, so keys are `<file>.<key>`.
- Read first: `docs/PRD.md` sections 4 and 7; both language folders fully.
- Glossary to enforce consistently (choose one term per concept and use it everywhere):
  - portfolio → المحفظة; transaction → معاملة; buy → شراء; sell → بيع; holding(s) → الحيازات / الممتلكات (pick one); average cost → متوسط التكلفة; unrealized P/L → الربح/الخسارة غير المحققة; realized → المحققة; price alert → تنبيه سعر; base currency → العملة الأساسية; large text → نص كبير; theme → المظهر; dark/light/system → داكن / فاتح / حسب النظام; import → استيراد; sign in with Google → تسجيل الدخول عبر Google; sign out → تسجيل الخروج; settings → الإعدادات; dashboard → لوحة المتابعة.
  - Keep coin tickers (BTC), currency codes (USD) and brand names (Google, CoinGecko) in Latin script.
- Interpolation placeholders like `{{count}}`, `{{symbol}}`, `{{date}}` must stay exactly as in English. i18next plural suffixes (`_one`, `_other`, and Arabic `_zero`, `_two`, `_few`, `_many`) — where an English key has `_one`/`_other`, provide the full Arabic set (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`).

## Parallel work warning

Another worker (P1) is fixing layout in `apps/web/src/**` and may **append** new keys to `ar/*.json` while you work. Re-read each `ar/*.json` immediately before editing it, change only values (and add plural forms), never delete keys, and never touch `en/*.json` or any `.tsx`/`.ts` file. No installs.

## Files you own

- `apps/web/src/i18n/ar/*.json` (values only; may add plural-form keys)

## Steps

1. For each file, compare every Arabic value against its English value: correct meaning, grammar, gender agreement, and the glossary above. Fix machine-sounding phrasing.
2. Ensure sentence punctuation uses Arabic forms where natural (`،` `؟`).
3. Keep string lengths reasonable for buttons (short imperatives).
4. After editing, run the key-set check (all files, en vs ar) and Prettier.

## Constraints

- No commits, pushes, installs. Values only.

## Acceptance criteria

- [ ] For every file, the ar key set equals the en key set plus any Arabic plural forms (`node -e` script output pasted).
- [ ] `pnpm exec prettier --check apps/web/src/i18n/ar` exits 0.
- [ ] `pnpm --filter @crypto-tracker/web typecheck` exits 0.
- [ ] Report lists the terms you unified and the files changed.

## Verification commands to run before reporting

```
pnpm exec prettier --check apps/web/src/i18n/ar
pnpm --filter @crypto-tracker/web typecheck
git status --short apps/web/src/i18n
```

## Report

Format from your agent instructions.
