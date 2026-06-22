# Customer app dark mode

Dark mode applies to the **customer mobile app** (`apps/app`) only. Admin stays on its own theme.

**Status (2026-06-22):** System / Light / Dark shipped in Account Settings. Core screens, shared chrome (header, profile bar, bottom nav, tab navigator), GoGoSense hub/banner, and wallet semantic status tints are migrated. Optional follow-up: colored metric/status pastels on Discovery, Quest, Credit Score, Referral, Money Action, and Shop Detail (wallet is the reference pattern).

## User control

Profile → **Account Settings** → **Appearance**:

| Option | Behavior |
|--------|----------|
| **System default** | Follows OS / browser `prefers-color-scheme` |
| **Light** | Always light palette |
| **Dark** | Always dark palette |

Preference is stored under `gogocash.theme.preference` (`expo-secure-store` on native, `localStorage` on web). Default is `system`.

## Architecture

```
themePreference.ts          — system | light | dark
themePreferenceStorage.ts   — persist / hydrate preference
resolveTheme.ts             — preference + system scheme → resolved light | dark
colorPalettes.ts            — lightColors / darkColors (ThemeColors) + pickThemed()
ThemeProvider.tsx           — useTheme(), useThemeColors(), ThemedStatusBar
ThemePreferenceOverride     — force a subtree without changing stored preference
useThemedStyles.ts          — memoized StyleSheet factory on colors
themeSurfaces.ts            — rgba overlays (nav, footer, profile glass, metrics)
tokens.ts                   — radii, spacing, typography; static `colors` = lightColors (legacy)
AppearanceSection.tsx       — Account Settings tri-state control
```

`app.config.ts` sets `userInterfaceStyle: "automatic"` so native splash/status bar can follow the OS when preference is `system`.

### Semantic tokens (`ThemeColors`)

| Token | Use | Light | Dark |
|-------|-----|-------|------|
| `card` | elevated card/row surface | `#FFFFFF` | `#1A1F1D` |
| `field` | inputs / control rows on a card | `#FFFFFF` | `#121615` |
| `fieldMuted` | subtle inset fill (was `#FAFAFA`) | `#FAFAFA` | `#161B19` |
| `border` | hairlines / dividers | `#E4E4E4` | `#2A302E` |
| `link` | inline hyperlink affordance | `#0064D6` | `#5B9BFF` |
| `isDark` | discriminator for `pickThemed` | `false` | `true` |

> **Never use `colors.white` as a `backgroundColor`** — it is `#FFFFFF` in *both* themes (it exists for text/icons on the green primary). Use `card`/`field`/`fieldMuted`.

### `pickThemed(colors, light, dark)`

For brand / web-parity tints that must keep their exact light hex (some source-parity
tests assert the literal) while still adapting in dark:

```ts
backgroundColor: pickThemed(colors, "#F3FCF9", colors.primarySoft),
```

### Navigator scene background

React Navigation paints the scene/card background from its own theme (light default
is `#F2F2F2`). `app/_layout.tsx` wraps the Stack in `ThemeProvider` (re-exported from
`expo-router`) with our resolved palette, and `(tabs)/_layout.tsx` sets `sceneStyle`
and themed tab bar colors, so every screen's backdrop follows the appearance setting.

### Web-only light gradients

Several marketing surfaces use `backgroundImage` linear gradients that only exist on
web. Gate them off in dark mode or they paint near-white bands over dark chrome:

```ts
backgroundImage: colors.isDark ? undefined : lightOnlyGradient,
```

Examples: `CustomerProfileBar` (`softPanelGradient`), `CustomerHomeScreen`
(`goLinkBackdropGradient`). Brand SVG assets (hero banner, GoGoPass header) stay fixed.

### Module-level `StyleSheet.create`

The bulk codemod only rewrites factories named `create*Styles(colors)`. Components
that still use a **module-level** `StyleSheet.create` (e.g. `CustomerDesktopBrandLink`)
must be migrated manually to `useThemedStyles`.

### Bulk migration helper

`scripts/themedify-colors.mjs` maps hardcoded light literals → tokens **only inside
`create*Styles(colors)` factories** (never inline JSX styles). Run `--write` to apply;
dry-run by default. Re-runnable / idempotent.

`scripts/migrate-themed-styles.mjs` is a one-off helper for lifting a file into the
`useThemedStyles` factory pattern — review diffs carefully.

### Patterns for screens

**Single component file**

```tsx
const styles = useThemedStyles(createFooStyles);
const { colors } = useTheme(); // only when icons / Switch need live colors

function createFooStyles(colors: ThemeColors) {
  return StyleSheet.create({ root: { backgroundColor: colors.background } });
}
```

**Large screen with many subcomponents** — either each subcomponent calls `useThemedStyles`, or provide a small React context (see `CustomerHomeScreen` + `HomeScreenThemeContext`).

**Render tests** — `vitest.render.setup.ts` wraps all renders in `<ThemeProvider>`.

## Palette (draft)

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#F6F6F6` | `#0F1110` |
| `card` | `#FFFFFF` | `#1A1F1D` |
| `ink` | `#3B3B3B` | `#E8ECEA` |
| `muted` | `#7F7F7F` | `#9AA3A0` |
| `primary` | `#00CC99` | `#00CC99` |
| `primaryDark` | `#00AA80` | `#33D9AD` |
| `primarySoft` | `#D8F8EF` | `#0D3D32` |

Brand greens stay consistent; surfaces and text invert for readability. There is no Next.js customer-web dark token set — this palette is authored in-repo (`colorPalettes.ts`).

## Intentional hardcoded colors

Some UI still uses fixed hex for **web parity** or **brand assets**:

- **Cookie consent banner** — always dark chrome (`#1D1929`) regardless of theme
- **Profile hero banner** — SVG / `#00CC99` brand gradient (web asset parity)
- **GoGoPass profile menu** — `#00AA80` header band, `#83F2D6` masked ID (marketing layout)
- **GoLink banner frosted pills** — intentional white translucent chips on the dark banner backdrop in dark mode
- **Quest / Discovery / Shop** — section-specific marketing tints matching Next.js (some still light-only pastels; see status above)
- **LINE / Shopee / merchant brand** — third-party icon colors (`#06C755`, etc.)
- **PDPA delete accent** — `#C45C00` (web parity)
- **`web-design-parity.test.ts`** — asserts light `tokens.colors` baseline

When adding new UI, prefer `ThemeColors` tokens first; add a comment if a hex must stay fixed.

## Verification

```bash
npm --prefix apps/app run typecheck
npm --prefix apps/app run test
npm --prefix apps/app run test:render
```

Manual: toggle Appearance on web (`npm run web`) and spot-check home, wallet, profile, account settings, GoGoSense hub. Compare System vs Light vs Dark and confirm header logo text, profile chip, globe control, and navigator backdrop track the palette.

## Related docs

- [design_system.md](./design_system.md) — light token reference + dark mapping table
- [mood_and_tone.md](./mood_and_tone.md) — aesthetic rules including dark surfaces
- [AGENTS.md](../AGENTS.md) — agent conventions for new themed UI
