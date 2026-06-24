# GoGoCash Mobile Design System Specs

This document defines the typography, color system, spacing, radius, shadows, and motion properties for the GoGoCash native mobile app, matching the Next.js staging web client.

**Implementation:** Light values below map to `lightColors` in `src/theme/colorPalettes.ts`. Dark mode uses a parallel `darkColors` palette via `ThemeProvider` — see **[dark-mode.md](./dark-mode.md)** for the full token list, migration patterns, and agent conventions. Static `tokens.colors` remains `lightColors` for legacy parity tests.

---

## 1. Visual Colors (light baseline)

| Category | Token | HEX Code | Purpose / Application |
| :--- | :--- | :--- | :--- |
| **Surfaces** | `bg-background` | `#F6F6F6` | Default viewport and main page background |
| | `text-default` | `#3B3B3B` | Default text color for body, descriptions, labels |
| | `surface-card` | `#FFFFFF` | Core panel background for lists, modals, cards |
| | `surface-muted` | `#F6F6F6` | Inactive headers, disabled controls |
| | `surface-strong` | `#D8F8EF` | Success/badge background highlights |
| **Brand Colors** | `gc-primary` | `#00CC99` | Brand primary Mint; buttons, indicators, tabs |
| | `gc-primary-strong` | `#00AA80` | Tap states, hover darks, prominent highlights |
| | `gc-primary-soft` | `#D8F8EF` | Light background panels, selected list cells |
| | `gc-accent` | `#005D46` | Deep accent green; page titles, large bold kickers |
| | `gc-accent-soft` | `#007D5E` | Subtitles, intermediate headers, dark text |
| **Text Shades** | `gc-text-muted` | `#7F7F7F` | Description labels, placeholder hints |
| | `gc-text-soft` | `#989898` | Helper/validation notes, light grey text |
| **Borders** | `gc-border` | `#E4E4E4` | Standard card dividers and text input lines |
| | `gc-border-strong` | `#D8E2D9` | Heavy separators, card contours |
| | `gc-border-mint` | `#B7E7DB` | Success alerts, primary active input outline |
| **Utility** | `gc-danger` | `#CD0D0D` | Error text, verification alerts, delete buttons |
| | `gc-warning` | `#FFD700` | Warning, yellow highlights, star elements |
| | `gc-success` | `#00A148` | Success badges, green positive text |

### 1.1 Dark theme mapping (`ThemeColors`)

The customer app resolves appearance at runtime. Use these mappings when authoring themed styles (`useThemedStyles` + `create*Styles(colors)`):

| Light / web token (§1) | `ThemeColors` key | Dark surface (draft) |
| :--- | :--- | :--- |
| `bg-background` / `surface-muted` | `background` | `#0F1110` |
| `text-default` | `ink` | `#E8ECEA` |
| `surface-card` | `card` | `#1A1F1D` |
| input / control fill on card | `field` | `#121615` |
| subtle inset (`#FAFAFA`) | `fieldMuted` | `#161B19` |
| `gc-text-muted` | `muted` | `#9AA3A0` |
| `gc-border` | `border` | `#2A302E` |
| `gc-primary` | `primary` | `#00CC99` (unchanged) |
| `gc-primary-soft` | `primarySoft` | `#0D3D32` |
| hyperlinks | `link` | `#5B9BFF` |

Brand mint greens (`gc-primary`, `gc-primary-strong`) stay on-brand in both themes; invert surfaces and body text, not the primary CTA color.

---

## 2. Typography Hierarchy

| Rule | English (DM Sans) | Thai (Anuphan) | Weight / Case |
| :--- | :--- | :--- | :--- |
| **Page Title** | `32px` | `32px` | Extra Bold (`800`) |
| **Section Title** | `24px` | `24px` | Bold (`700`) |
| **Card Title** | `16px` | `16px` | Semi-Bold (`600`) |
| **Body Text** | `14px` | `14px` | Medium (`500`) |
| **Caption Text** | `12px` | `12px` | Regular (`400`) |
| **Kicker / Label** | `11px` | `11px` | Bold (`700`), UPPERCASE, tracking `0.18em` |

---

## 3. Shapes and Shadows

- **Small Radius (`radii.sm`)**: `8px` — Used for category chips, tag badges, small buttons.
- **Medium Radius (`radii.md`)**: `16px` — Used for standard brand lists, search bars, text boxes, and cards.
- **Large Radius (`radii.lg`)**: `24px` — Used for landing slides, promo panels, profile dashboards, and modals.
- **Pill Radius**: `999px` — Used for action pills, copy links, social rows, and bottom tabs.

### Shadows
- **Card Shadow**: `0 4px 10px rgba(0, 0, 0, 0.1)`
- **Header/Footer Shadow**: `0 4px 16px rgba(0, 0, 0, 0.05)`
- **Bottom Navigation Active Glow**: Soft shadow offset with light mint glow.

### Brand cards
- Shared component: `src/components/BrandCard.tsx` — `size="L"` (Top Brands, coupon chip + heart) and `size="S"` (compact rails/grids).
- Cashback line copy: **`Cashback upto {rate}%`** (`webDesignParity.cashbackLabel` + i18n) — no space in "upto".

---

## 4. Spacing and Breakpoints

Source of truth: `mobileShellLayout` in `src/design/webDesignParity.ts`.

- **Breakpoint Desktop (`desktopBreakpoint`)**: `1024px`
- **Breakpoint Tablet (`tabletBreakpoint`)**: `768px`
- **Content Max Width (`contentMaxWidth` / `desktopContentMaxWidth`)**: `1440px` — centered shell column on wide desktop web previews; header/footer break out to full viewport width
- **Tablet content cap (`tabletContentMaxWidth`)**: `720px`
- **Bottom Nav Max Width (`bottomNavMaxWidth`)**: `448px` (horizontally centered on phone/tablet)
- **Canvas widths (fixed content per device class)**: mobile `430px`, tablet `820px`, desktop `1280px`
- **Desktop header**: `80px` tall (`desktopHeaderHeight`); sub-nav `56px` (`desktopSubNavHeight`)
- **Home desktop rhythm**: top gap `64px` (`desktopHomeTopGap`), section stack gap `40px` (`desktopHomeStackGap`), footer lead-in margin `40px` + inner padding `56px` (`desktopFooterTopMargin` / `desktopFooterTopPadding`)
- **Mobile home stack gap (`contentTopGap`)**: `24px`
- **Safe Area Top Gap**: `Math.max(8, insets.top + 8)`
- **Safe Area Bottom clearance**: `Math.max(14, insets.bottom + 8)`

---

## 5. Motion and Interactions

### Interaction Variables
- **Fast Duration**: `140ms`
- **Base Duration**: `220ms`
- **Emphasis Duration**: `320ms`
- **Standard Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Spring Overshoot Easing**: `cubic-bezier(0.34, 1.56, 0.64, 1)`

### Expected Animations
1. **Pills & Buttons**: Tap feedback scales down marginally (`scale: 0.97`) over `140ms`.
2. **Carousel Swiping**: Slides spring into place gently.
3. **Sub-page Transitions**: Sidebar routes fade and translate horizontally by `6px` using standard easing.
4. **Loading Skeletons**: Standard shimmer opacity pulses slowly.

---

**See also:** [dark-mode.md](./dark-mode.md) — runtime palette and migration patterns.
