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
- Avoid raw colors (such as solid saturated red, pure blue, or basic neon green). Use tailored HSL color tokens via `ThemeColors` (`useTheme()` / `useThemedStyles`).
- **Light** remains the web-parity reference. Cards use subtle gradient glows and thin gray borders on `#F6F6F6` backgrounds.
- **Dark** keeps the same hierarchy and mint accent energy but inverts surfaces: deep charcoal viewport (`#0F1110`), elevated cards (`#1A1F1D`), softened body text (`#E8ECEA`). Do not paste light-theme white fills into dark mode — use `card` / `field` / `fieldMuted`.
- User-selectable **System / Light / Dark** lives in Account Settings; default is System. See [dark-mode.md](./dark-mode.md).

### 2.2 Glassmorphism and Panels
- **Backdrop Blurs**: Floating dialogs, popovers, and sticky search bars must use standard backdrop blur styles (`backdrop-filter: blur(14px)` on web, equivalent translucency on native) with semi-transparent fills from `themeSurfaces.ts` (light: white glass; dark: deep translucent overlays).
- **Soft Panels (light)**: Dashboards use thin, muted borders and a top-to-bottom white-to-light-mint gradient:
  ```css
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 244, 0.92));
  ```
- **Soft Panels (dark)**: Disable web-only light gradients (`colors.isDark ? undefined : gradient`) so panels read as solid themed surfaces instead of glowing white bands. Profile bar and GoLink backdrop follow this rule.

### 2.3 Micro-Animations and Feedback
- Every tap on a button or card must show immediate feedback. Use `active` scale transitions (`scale: 0.97`) to make the interface feel responsive and tangible.
- Lists and dashboards should reveal elements with a staggered entrance delay (50ms per item) to make layout painted states look cohesive.
- Skeletons should pulse in-place instead of using jarring loading spinners.

### 2.4 Capped Mobile Width (Responsive Preview)
- Large displays or desktop web previews must never stretch the mobile UI elements horizontally.
- Layout uses three device classes (Desktop / Tablet / Mobile) resolved per element (see `useDeviceClass`). Content columns are centered and capped per class: `448px` (bottom navigation, `bottomNavMaxWidth`), `720px` (portrait-tablet content, `tabletContentMaxWidth`), and `1440px` (mobile/desktop shell content, `contentMaxWidth` / `desktopContentMaxWidth`) — all from `src/design/webDesignParity.ts`.
- On **desktop home**, brand carousel pages use **`brandSectionFrameWidth`** with **two rows** (`getDesktopBrandColumnsPerRow`) — not a single full-viewport horizontal strip. Header and footer bands break out to **full viewport width** while main content stays in the 1440px column.

---

**See also:** [dark-mode.md](./dark-mode.md) — dark-surface aesthetic rules and gradient gating.
