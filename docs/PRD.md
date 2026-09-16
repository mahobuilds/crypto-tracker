# Crypto Portfolio Tracker — Product Requirements Document

**Version:** 1.0 (draft)
**Date:** 2026-09-14
**Status:** Closed for v1. Open questions in section 12 to be resolved during technical design.

---

## 1. Overview

A personal crypto portfolio tracking application built for a single primary user (the owner's father). The user manually records buy and sell transactions, and the app keeps a running picture of their holdings, current value, and profit/loss, with live prices and simple visualizations.

The app must be easy to use on both a phone and a laptop, support English and Arabic, and keep data in sync across all devices.

## 2. Goals

- Make it simple to log a crypto purchase or sale in under a minute.
- Show, at a glance, what the portfolio is worth right now and whether it is up or down.
- Let the user check the live price of any coin, owned or not.
- Work the same on mobile and laptop with data always in sync.
- Be readable and comfortable for a non-technical, possibly older user.

## 3. Non-Goals (v1)

- No exchange or wallet API integrations (no automatic transaction import from Binance, Coinbase, etc.).
- No transaction types other than buy and sell (no transfers, staking, airdrops, swaps).
- No offline mode.
- No multi-user or shared portfolios.
- No tax reporting.
- No trading or order placement.

## 4. Target User

- One primary user: the owner's father.
- Non-technical. Prefers large, clear text and few screens.
- Uses both a mobile phone and a laptop.
- Reads English and Arabic.

## 5. Platform

- Responsive web application, delivered as a Progressive Web App (PWA).
- Single codebase serving mobile browsers and desktop browsers.
- Installable to the phone home screen and desktop for an app-like experience.
- Requires an internet connection at all times.

## 6. Features

### 6.1 Authentication

- Sign in with Google only. No email/password accounts.
- One Google account maps to one portfolio.
- Session persists across visits until the user signs out.

### 6.2 Cloud Sync

- All data (transactions, settings, alerts) stored in a cloud database tied to the user's account.
- Any change made on one device appears on all other signed-in devices without manual action.

### 6.3 Transactions

**Supported types:** Buy, Sell.

**Fields per transaction:**
- Type (buy / sell)
- Coin (selected from a searchable coin list)
- Quantity
- Price per unit (in the transaction currency)
- Total value (auto-calculated: quantity × price, editable)
- Fee (optional, default 0)
- Date and time
- Note (optional free text)

**Actions:**
- Add a transaction.
- Edit an existing transaction.
- Delete a transaction (with confirmation).
- View transaction history as a list, sorted by date (newest first).
- Filter history by coin and by type.

**Validation:**
- A sell cannot exceed the currently held quantity of that coin.
- Quantity and price must be positive numbers.

### 6.4 CSV Import

- User uploads a CSV file following a fixed template.
- Template columns: `date, coin, type, quantity, price, fee, note`.
- The app provides a downloadable sample CSV showing the expected format.
- Before committing, the app shows a preview of parsed rows and highlights any rows with errors.
- User confirms to import valid rows. Rows with errors are skipped and reported.

### 6.5 Live Prices

- Prices are fetched from a public market data API (candidate: CoinGecko).
- Prices refresh automatically at a fixed interval (target: every 60 seconds) while the app is open.
- The dashboard shows the current price of every coin the user holds.
- A search screen lets the user look up the current price of any listed coin, whether owned or not.
- Each price shows the 24-hour change (amount and percentage).

### 6.6 Dashboard

**Summary cards:**
- Total portfolio value (in base currency)
- Total amount invested
- Profit / loss — absolute amount and percentage

**Holdings table (one row per owned coin):**
- Coin name and symbol
- Quantity held
- Average cost per unit
- Current price
- Current value
- Profit / loss (amount and percentage)
- Share of portfolio (%)

**Charts:**
- Line chart: total portfolio value over time.
- Pie chart: allocation by coin.
- User can choose which charts are shown and in what order (saved in settings).

### 6.7 Profit / Loss Calculation

- Method: **average cost**.
- For each coin, average cost = total spent on buys (including fees) ÷ total quantity bought.
- Selling reduces quantity held but does not change the average cost of the remainder.
- Unrealized P/L = (current price − average cost) × quantity held.
- Realized P/L from sells = (sell price − average cost at time of sell) × quantity sold − fee.

### 6.8 Price Alerts (optional feature)

- Master toggle in Settings: alerts on / off. Off by default.
- When on, user can create alerts: coin, target price, direction (above / below).
- When the condition is met, the user receives:
  - A push notification (via PWA push).
  - An in-app banner on next open.
- An alert fires once and is then marked as triggered. User can re-enable or delete it.

### 6.9 Settings

- Language: English / Arabic. Arabic uses full right-to-left layout.
- Base currency: USD, EUR, SAR, TRY. All portfolio values convert to the chosen currency using a live FX rate.
- Large text: on / off. Increases font size and touch target size across the app.
- Theme: light / dark / follow system.
- Price alerts: on / off (see 6.8).
- Dashboard charts: choose which charts display and their order.
- Sign out.

## 7. Localization

- All UI strings translated into English and Arabic.
- Arabic layout mirrors horizontally (RTL), including navigation, tables, and charts where sensible.
- Numbers, dates, and currency formatted according to the selected language and currency.

## 8. Accessibility

- Large text mode (see 6.9).
- Minimum touch target size on mobile of 44 × 44 px.
- Sufficient color contrast in both light and dark themes.
- Profit shown in green and loss in red, always accompanied by a +/− sign so color is not the only signal.

## 9. Data Model (high level)

- **User**: id, google id, email, display name, created at.
- **Settings**: user id, language, base currency, large text, theme, alerts enabled, chart preferences.
- **Transaction**: id, user id, type, coin id, quantity, price per unit, total, fee, currency, timestamp, note.
- **Alert**: id, user id, coin id, target price, direction, enabled, triggered at.
- **Portfolio snapshot** (for the value-over-time chart): user id, timestamp, total value in base currency.

## 10. External Dependencies

- Google Sign-In (OAuth).
- Market data API for coin prices and coin search (candidate: CoinGecko).
- FX rate API for currency conversion (candidate: same provider or a free FX API).
- Push notification service (Web Push).

## 11. Success Criteria

- Adding a transaction takes fewer than 60 seconds on a phone.
- Dashboard loads in under 2 seconds on a normal mobile connection.
- Data entered on one device appears on another within 5 seconds.
- The father can use the app in Arabic with large text without assistance.

## 12. Open Questions

- How far back should the portfolio value chart go, and how often should snapshots be taken (hourly, daily)?
- Should the coin list be limited to a curated set of popular coins, or include everything the market data API offers?
- Should there be an export (CSV) of transactions in addition to import?

## 13. Future Ideas (not in v1)

- Additional transaction types: transfer, staking reward, airdrop.
- Exchange API integrations.
- Multiple portfolios per user.
- Tax reports.
- Offline mode.
