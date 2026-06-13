# Membership page — hero & calculator copy (English)

Source: `src/messages/en.json` → `membership.*` keys. Thai strings: `src/messages/th.json` (same keys).

---

## GoGoQuest strip

| Element        | Copy                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Kicker         | **GoGoQuest**                                                        |
| Period         | **April 2026**                                                       |
| Countdown label | **Ends in**                                                         |
| Countdown value | *Dynamic* (e.g. `25d 4h 52m 45s`) — `useMembershipLanding`          |

---

## Hero headline & body

**Headline**

> The same purchase. 3× the points.

**Body**

> Free users left ฿3,000 on the leaderboard last month. GoGoPass members didn't.

---

## Tier snapshot (hero cards)

| Tier     | Label      | Multiplier | Example points (UI) |
| -------- | ---------- | ---------- | --------------------- |
| Free     | Free       | 1×         | 5,300 pts             |
| GoGoPass | GoGoPass   | 1.5×       | 7,950 pts             |

*Point totals are driven by membership landing scripts; amounts match the live demo.*

---

## Calls to action

- **Primary:** Unlock My Multiplier →
- **Secondary:** See how it works ↓

---

## Calculator (section below hero)

**Section title**

> How many points are you leaving behind?

**Field**

- Label: *I spend approximately*
- Hint: *Adjust the slider or type an amount (฿)*
- Default example: *3,000*

---

## i18n keys (reference)

| UI area        | Key(s) |
| -------------- | ------ |
| Quest strip    | `heroEyebrowKicker`, `heroEyebrowPeriod`, `heroCountdownLabel` |
| Hero title/body | `heroH1`, `heroBody` |
| Tier labels    | `tierFree`, `tierStarter` |
| CTAs           | `unlockCta`, `seeHow` |
| Calculator     | `calcHeading`, `spendLabel`, `spendHelp` |

---

## Related engineering doc

See [membership.md](./membership.md) for implementation notes.
