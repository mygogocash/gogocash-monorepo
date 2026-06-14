import { useCallback, type ChangeEvent } from "react";

import type { BirthDateFieldProps } from "@mobile/components/BirthDateField.types";
import { dmyToIso, isoToDmy } from "@mobile/lib/birthdate";
import { colors, typography } from "@mobile/theme/tokens";

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Web birthdate picker — the browser-native `<input type="date">` calendar. It stores YYYY-MM-DD per
 * the HTML spec and DISPLAYS in the user's locale (DD/MM/YYYY in th-TH), but converts to/from the
 * app's DD-MM-YYYY string so the shared validators (parseDmyDate / isValidBirthdate / isOver20) are
 * reused unchanged. Native uses @react-native-community/datetimepicker (BirthDateField.native.tsx).
 * The element renders transparently to fill the box the screen wraps it in (the box carries the
 * border/radius + the green focus affordance via the forwarded onFocus/onBlur).
 */
export function BirthDateField({
  value,
  onChange,
  accessibilityLabel,
  editable = true,
  maxToday = true,
  onFocus,
  onBlur,
  testID,
}: BirthDateFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(isoToDmy(event.target.value));
    },
    [onChange],
  );

  return (
    <input
      aria-label={accessibilityLabel}
      data-testid={testID}
      disabled={!editable}
      max={maxToday ? todayIso() : undefined}
      onBlur={onBlur}
      onChange={handleChange}
      onFocus={onFocus}
      type="date"
      value={dmyToIso(value)}
      style={{
        backgroundColor: "transparent",
        border: "none",
        color: colors.ink,
        colorScheme: "light",
        cursor: editable ? "pointer" : "default",
        flex: 1,
        fontFamily: typography.family,
        fontSize: 16,
        minHeight: 24,
        minWidth: 0,
        outline: "none",
        width: "100%",
      }}
    />
  );
}
