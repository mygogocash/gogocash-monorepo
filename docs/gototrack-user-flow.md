# GoGoTracking — Customer Journey

Formal overview aligned with [GoGoCash Protocol Camp pitch](file:///Users/kunanonjarat/Downloads/Pitch_GoGoCash%20for%20Protocol%20Camp.pdf) and the [Figma brainstorm board](https://www.figma.com/board/hcMbQr0cngF0Kib1eq6QaP/GoGoCash-Brainstorm?node-id=2082-214).

![GoGoTracking — formal customer journey](./assets/gototrack-user-flow.svg)

> **Slide export (PNG):** [`gototrack-user-flow.png`](./assets/gototrack-user-flow.png)

---

## Executive summary

**GoGoTracking** is GoGoCash’s agentic AI capability that **detects supported merchant applications automatically**, so customers **do not need to manually click through affiliate links** before every purchase.

| | Traditional cashback apps | GoGoCash GoGoTracking |
| --- | --- | --- |
| User action before shop | Open app → copy link → paste in browser | Open merchant app directly |
| Tracking activation | Manual, easy to forget | Automatic detection + one-tap **Accept** |
| Outcome when forgotten | Cashback lost | Prompt appears while shopping |

---

## Customer journey (5 steps)

### Step 01 — Enable GoGoTrack *(one-time)*

- Open **GoGoCash**
- Enable **GoGoTrack** in settings
- Grant permissions as prompted  
- *เปิดใช้งานครั้งเดียว*

### Step 02 — Automatic merchant detection

- Customer opens a supported merchant app (e.g. Shopee, Lazada)
- **GoGoTracking** identifies the merchant context automatically
- No manual link copy/paste  
- *Agentic AI ตรวจจับร้านค้าอัตโนมัติ*

**Technology:** Google-approved **UsageStatsManager** — not Accessibility Service (Play Store compliant).

### Step 03 — Confirm & activate

- GoGoCash surfaces a system prompt: **“Cashback available — tap Accept”**
- Customer confirms with one tap (or dismisses if not shopping)  
- *ยืนยันการรับเงินคืน*

### Step 04 — Shop & pay

- Platform opens the **tracked affiliate deep link**
- Customer browses and checks out as usual  
- *ชำระสินค้าตามปกติ*

### Step 05 — Receive cashback

- Merchant confirms the order
- Cashback is credited to the **GoGoCash wallet**
- Withdrawal available per platform policy (e.g. within 72 hours)  
- *รับเงินคืน · Earn Cashback on Every Spend*

---

## Market context (from pitch)

> ลูกค้ามักลืมกดเข้า GoGoCash ก่อนซื้อ — ระบบติดตามไม่ได้ เงินคืนที่ควรได้จึงสูญหาย

GoGoTracking addresses this recurring support issue by removing the dependency on **remembering to open GoGoCash first**.

---

## Trust & compliance

| Topic | Statement |
| --- | --- |
| **Privacy** | Does not read messages, passwords, or payment details |
| **Scope** | Detects **which merchant app is in foreground** — with user consent only |
| **Control** | User may disable GoGoTrack at any time |
| **Platform** | UsageStatsManager (Google-approved); not restricted Accessibility Service |
| **Regulatory posture** | PDPA-aligned product design |

---

## Competitive positioning

**Auto Tracking** — automatic merchant detection without manual link clicks — is a **GoGoCash differentiator** versus manual-link competitors (per Protocol Camp pitch, slide 6).

---

*Internal technical documentation: `docs/gototrack-android-acceptance-plan.md`*
