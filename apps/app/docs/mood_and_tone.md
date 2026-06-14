# GoGoCash Mood and Tone Spec

This document details the premium design guidelines, aesthetics, and user experience tone for the GoGoCash native mobile app, aligned with the Next.js web customer reference.

---

## 1. Aesthetic Tone and Emotion

GoGoCash is designed to feel:
- **Trustworthy & Solid**: Clean grids, legible text, and distinct data summaries build user confidence during withdrawals.
- **Rewarding & Alive**: Mint green accents, vibrant badges, and gentle micro-animations draw user engagement to rewards.
- **Premium & Modern**: Smooth corners, glassmorphism card panels, and harmonic, soft backgrounds prevent the typical "budget app" feel.

---

## 2. Aesthetic Rules

### 2.1 Color Palette Control
- Avoid raw colors (such as solid saturated red, pure blue, or basic neon green). Use tailored HSL color tokens.
- Light theme is dominant. Cards must have subtle gradient glows and thin gray borders.
- Background remains a soft, non-intrusive gray-white (`#F6F6F6`).

### 2.2 Glassmorphism and Panels
- **Backdrop Blurs**: Floating dialogs, popovers, and sticky search bars must use standard backdrop blur styles (`backdrop-filter: blur(14px)` on web, equivalent translucency on native) with semi-transparent white fills.
- **Soft Panels**: Dashboards use thin, muted borders and a top-to-bottom white-to-light-mint gradient:
  ```css
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 244, 0.92));
  ```

### 2.3 Micro-Animations and Feedback
- Every tap on a button or card must show immediate feedback. Use `active` scale transitions (`scale: 0.97`) to make the interface feel responsive and tangible.
- Lists and dashboards should reveal elements with a staggered entrance delay (50ms per item) to make layout painted states look cohesive.
- Skeletons should pulse in-place instead of using jarring loading spinners.

### 2.4 Capped Mobile Width (Responsive Preview)
- Large displays or desktop web previews must never stretch the mobile UI elements horizontally.
- The interface caps at `448px` (for navigation controls) and `760px` (for screens), preserving centered balance.
