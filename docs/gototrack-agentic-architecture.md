# GoGoTrack — Agentic Architecture (Simple)

Non-technical overview for pitch decks, Figma, and stakeholder alignment.

**One line:** Notification or app → GoGoCash turns on cashback → You shop → Money back in wallet.

---

## Quick read (5 seconds)

| You | AI notification | GoGoCash | Brand |
| --- | --- | --- | --- |
| Open a supported brand app | Alert: cashback available | Find deal + turn on tracking | You browse & pay |
| Tap **Accept** / **Continue** | Ask to confirm | Send cashback to wallet | Confirm order |

---

## Slide assets

| Asset | Path |
| --- | --- |
| SVG (import to Figma) | [`assets/gototrack-agentic-architecture.svg`](./assets/gototrack-agentic-architecture.svg) |
| Figma copy blocks | [`assets/gototrack-agentic-architecture.figma-copy.txt`](./assets/gototrack-agentic-architecture.figma-copy.txt) |

**Figma / FigJam import:** Delete the old broken import first. Drag in a fresh copy of the SVG, or use **Place image**. The file uses flat coordinates (no nested transforms) so FigJam renders correctly. If text still overlaps, use **File → Import** in Figma Design (not FigJam paste) and ungroup once.

---

## Four roles

| Role | Plain English |
| --- | --- |
| **You** | Tell us which brand you’re using; tap **Continue**; shop as normal |
| **AI notification** | Smart alert on your phone; shows cashback %; asks you to confirm |
| **GoGoCash** | Checks the offer, activates tracking, credits your wallet |
| **Brand** | Shopee, Lazada, etc. — you pay there; they send us commission when you buy |

---

## Three steps (summary)

| # | Step | What happens |
| --- | --- | --- |
| **1** | **Browse** | Which brand? (app auto-detect or smart notification) |
| **2** | **Activate** | GoGoCash turns on cashback tracking (one tap / “Continue”) |
| **3** | **Earn** | You checkout → cashback appears in your GoGoCash wallet |

## Full flow (9 steps)

1. You open a brand app (e.g. Shopee)
2. AI notification finds cashback
3. GoGoCash checks offer with brand
4. Brand returns cashback rate (e.g. up to 5%)
5. AI notification asks **Continue?**
6. You confirm **Yes**
7. GoGoCash turns on tracking
8. You shop on brand
9. Cashback credited to wallet

---

## Old way vs GoGoTrack

| Old way | GoGoTrack |
| --- | --- |
| Open GoGoCash before every shop | Reminded **while** you shop |
| Copy/paste affiliate links | One tap: **Accept** or **Continue** |
| Easy to forget → lost cashback | Hard to miss → more cashback earned |

---

## Technical mapping (for product/engineering)

This diagram is the **same journey** as the mobile GoGoTrack flow in [`gototrack-user-flow.md`](./gototrack-user-flow.md), with **AI notification** (background prompt / system alert) as the primary touchpoint instead of manual link copy.

| Diagram step | API / product (existing on `dev`) |
| --- | --- |
| Browse / check brand | `GET /gototrack/merchants`, `GET /gototrack/merchants/search?q=`, `POST /gototrack/detect` (`method: manual`, `merchantHint`) |
| Agent browse / match | `GET /agent/v1/gototrack/merchants/search?q=`, `POST /agent/v1/gototrack/match-merchant` → structured cards |
| Activate tracking | `POST /gototrack/activate` or `POST /agent/v1/gototrack/activate-cashback` → Involve affiliate deeplink + `gogocash://` app link |
| History | `GET /gototrack/timeline` or `GET /agent/v1/gototrack/timeline` |
| Cashback in wallet | Involve postback → existing point/wallet pipeline |

Maps to existing background prompt flow: `GototrackMonitorService` → **Cashback available** notification → `POST /gototrack/activate` (`source: gototrack_background_prompt`).

**MCP server:** [`packages/gototrack-mcp/README.md`](../packages/gototrack-mcp/README.md) — stdio tools `search_merchants`, `match_merchant`, `activate_cashback`, `get_timeline` against `/agent/v1/gototrack/*`.

---

## Related docs

- [`gototrack-user-flow.md`](./gototrack-user-flow.md) — 5-step customer journey (native)
- [`gototrack-android-acceptance-plan.md`](./gototrack-android-acceptance-plan.md) — device QA on Railway dev
