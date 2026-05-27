# Executive Summary
Align the Expo desktop header language and region flow with the Next.js `LocalePanel` popover selected from the globe button.

# Business Goals
Customers should see the same language and region chooser in Expo web desktop previews that they see in the Next.js customer shell.

# Technical Goals
- Add a reusable Expo header locale popover without changing the `/language` account settings route.
- Keep the popover data, labels, selected defaults, and scroll behavior aligned with the Next.js header.
- Preserve the current desktop header, category navigation, and sign-in layout.

# Requirements
- Globe button opens and closes a dialog labelled `Choose language and region`.
- Dialog sections are `LANGUAGE` and `REGION`.
- Languages: English and ไทย.
- Regions: Thailand, Taiwan, China, Japan, Singapore, Malaysia, Indonesia, Philippines, Vietnam, Southeast Asia.
- Default selected language is English and default selected region is Thailand.
- Region list is vertically scrollable like the Next.js reference.

# Non-Goals
- Do not replace the account settings `/language` route.
- Do not add full app i18n routing in this slice.
- Do not change mobile bottom navigation.

# Architecture
Store the locale-region option contract in `webDesignParity.ts` and render it from `CustomerDesktopHeader`. Selection is local header state for now because the Expo app does not currently use `/en` and `/th` route prefixes.

# Security
No secrets or backend data are touched.

# Edge Cases
- Reopening the popover preserves the selected local option during the current session.
- The region list stays inside the popover at desktop widths.
- Header category nav remains clickable after the popover closes.

# Testing Strategy
- RED static parity test for the option contract and header wiring.
- Focused Vitest run.
- Browser smoke against Expo web at desktop viewport after implementation.

# Rollback Plan
Remove `webLocaleRegionPanel`, popover state, and the header test; the globe button returns to the previous no-op button.

# Acceptance Criteria
- Focused parity test passes.
- `npm run typecheck` passes.
- Desktop browser smoke can click the globe and see the language/region dialog with the Next.js option set.
