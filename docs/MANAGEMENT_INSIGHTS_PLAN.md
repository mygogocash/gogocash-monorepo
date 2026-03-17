# GoGoCash Management Insights – Plan

Plan for representing insight data on the GoGoCash admin dashboard so management can monitor performance, growth, and operations at a glance.

---

## 1. Goals

- **Single view**: Management can see health and performance without opening multiple pages.
- **Comparable**: Show current period vs previous period (e.g. MoM, QoQ) where relevant.
- **Actionable**: Highlight items that need attention (e.g. pending withdrawals, low conversion).
- **Trustworthy**: Use existing API data; call out any mock/estimated data clearly.

---

## 2. Data Available (Current Platform)

| Domain        | Source / API              | Key fields |
|---------------|---------------------------|------------|
| Users         | `GET /dashboard/stats`    | `gogocashUsers`, `mycashbackUsers` |
| Users list    | `GET /user` (paginated)   | Total count, optional filters |
| Conversions   | `GET /conversion`         | Count, status, payout, sale_amount, currency, datetime, offer_id |
| Withdrawals   | `GET /withdraw`           | Count, status, amount_total, amount_net, currency, totals by status/currency |
| Offers        | `GET /offer`              | Count, categories, commission |
| Fee           | Fee API                   | Fee rate / config |

---

## 3. Proposed Insight Sections

### 3.1 Executive summary (top of dashboard)

- **Purpose**: One-row snapshot for management.
- **Content**:
  - **GoGoCash users** (current) + optional % vs last period if we have historical.
  - **MyCashBack users** (current) + optional % vs last period.
  - **Total conversions** (current period, e.g. this month) + % vs previous period.
  - **Total payout / cashback** (e.g. THB + USD) for current period + % vs previous period.
  - **Withdrawals**: e.g. “X pending”, “Y approved this month”, link to Withdraw management.
- **Implementation**: Reuse/enhance existing Overview; add conversion/withdraw aggregates (from list APIs or new summary endpoints) and period comparison when backend supports it.

### 3.2 User growth & reach

- **Purpose**: Show platform reach and growth.
- **Content**:
  - GoGoCash vs MyCashBack user counts (already in Overview).
  - Optional: simple trend (e.g. last 6 months) if we store or can aggregate user counts by month.
- **Visual**: Keep current KPI cards; later add a small line or bar chart “Users over time” if data exists.

### 3.3 Conversion & revenue performance

- **Purpose**: Answer “How many conversions and how much value?”
- **Content**:
  - **Conversion count** for selected period (e.g. this month, this quarter) and comparison to previous period.
  - **Revenue / payout** (e.g. total payout or sale_amount) by period; by currency (THB, USD) if available.
  - **Trend chart**: Conversion and revenue over time (Monthly Conversion + Statistics charts already support this; ensure they use real or clearly labelled mock data).
- **Visual**: Keep Performance (Statistics) and Monthly view; optionally add a small “vs last period” summary above or beside the chart.

### 3.4 Withdrawals & cash flow

- **Purpose**: Visibility on payout pipeline and risk.
- **Content**:
  - **Pending withdrawals**: Count and total amount; link to Withdraw management.
  - **Approved (e.g. this month)**: Count and total amount.
  - **Rejected**: Count (and optionally amount) for dispute/audit context.
  - Optional: **Totals by currency** (THB, USD) from existing withdraw summary if API returns it.
- **Visual**: One compact card or small table “Withdrawals at a glance” with status breakdown and “View all” link.

### 3.5 Offers & engagement (optional, phase 2)

- **Purpose**: Which offers drive conversions.
- **Content**:
  - **Active offers** count.
  - **Top N offers** by conversion count or payout (requires conversion data grouped by offer_id or similar).
- **Visual**: Table or bar chart “Top offers this month” when backend can provide aggregates.

### 3.6 Operational health & actions

- **Purpose**: Things that need attention.
- **Content**:
  - **Pending withdrawals** requiring approval (count + link).
  - **Recent activity** (conversions and withdrawals) – already present; keep and optionally add filters (e.g. last 7 days).
- **Visual**: Keep Recent activity; add a small “Attention” or “Pending” strip/card if there are pending withdraws or other configurable alerts.

---

## 4. Implementation Phases

### Phase 1 – Foundation (current dashboard + minimal backend)

- Keep existing: Overview (users + Customers + Conversion), Performance (Statistics), Monthly view, Recent activity.
- Add **Withdrawals at a glance**: one card or strip showing pending / approved / rejected counts (and optionally totals) from existing withdraw list or summary API; link to `/withdraw`.
- Add **period labels** to charts (e.g. “Jan–Dec 2025”, “This month”) so management knows what they’re looking at.
- Ensure **metadata/titles** say “GoGoCash” and “Management” where appropriate (e.g. page title, section headings).

### Phase 2 – Real aggregates & comparison

- Backend: **Summary endpoints** (or derived from existing lists with care for performance), e.g.:
  - `GET /dashboard/summary?period=month` returning: conversion count, total payout (by currency), withdraw counts by status, optional user deltas.
  - Optional: same for `period=quarter` and last period for comparison.
- Dashboard:
  - **Executive summary**: Replace or supplement static “Customers / Conversion” with API-driven conversion count and total payout; add “vs last period” when backend provides it.
  - **Withdrawals card**: Use summary for pending/approved/rejected and amounts.
  - **Charts**: Optionally feed Monthly Conversion and Statistics from summary time-series when available.

### Phase 3 – Deeper insights

- **User trend**: If we store or can compute user counts by month, add “Users over time” chart.
- **Offers performance**: Top offers by conversion/revenue (new endpoint or aggregation from conversion data).
- **Alerts**: Configurable thresholds (e.g. “Notify when pending withdrawals > X” or “Conversion drop > Y%”) and a small “Alerts” or “Attention” block on the dashboard.
- **Export**: “Download summary (PDF/CSV)” for the current view (e.g. KPIs + table of recent activity) for meetings and reporting.

---

## 5. UI/UX Principles

- **Hierarchy**: Executive summary first, then trend charts, then operational detail (recent activity, withdraw at a glance).
- **Consistency**: Reuse existing card and chart styles; same section labels pattern (e.g. “OVERVIEW”, “PERFORMANCE”).
- **Trust**: If any card or chart uses mock or estimated data, show a small “Demo data” or “Sample” badge until real API is connected.
- **Mobile**: Keep sections stacking and charts responsive so management can check on the go.
- **Access**: Ensure only admin/management roles can see sensitive financial and user counts (already behind AuthGuard).

---

## 6. Success Criteria

- Management can answer in &lt; 30 seconds:
  - “How many users do we have?” (GoGoCash + MyCashBack)
  - “How are conversions and revenue this month vs last?”
  - “How much is pending in withdrawals?”
- All numbers traceable to real APIs (or clearly marked as demo).
- No new role or permission model required for Phase 1; later phases can add “management report” role if needed.

---

## 7. File / Component Map (for implementation)

- **Dashboard page**: `src/app/(admin)/dashboard/page.tsx` – add “Withdrawals at a glance” and optional “Executive summary” row.
- **New components** (suggested):
  - `DashboardWithdrawSummary.tsx` – pending/approved/rejected counts + link to `/withdraw`.
  - `DashboardSummaryKpis.tsx` (Phase 2) – conversion count, total payout, vs last period, fed by summary API.
- **API**:
  - Keep using `getDashboardStats`, `getConversion`, `getWithdraws` for Phase 1.
  - Add `getDashboardSummary(period)` in Phase 2 when backend is ready.
- **Types**: Extend `src/types/api.ts` with `DashboardSummaryResponse` when adding summary endpoint.

---

*Document version: 1.0. Last updated: 2025.*
