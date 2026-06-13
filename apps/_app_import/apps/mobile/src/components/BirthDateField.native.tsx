import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import type { BirthDateFieldProps } from "@mobile/components/BirthDateField.types";
import { dateToDmy, parseDmyDate } from "@mobile/lib/birthdate";
import { colors, typography } from "@mobile/theme/tokens";

const DEFAULT_DOB = new Date(2000, 0, 1);

/**
 * Native birthdate picker — taps open the OS date picker (@react-native-community/datetimepicker).
 * Mirrors BirthDateField.tsx (web): speaks the app's DD-MM-YYYY string and forwards onFocus/onBlur so
 * the screen's green focus border still toggles. Web uses the browser <input type="date"> instead.
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
  const [open, setOpen] = useState(false);
  const selected = parseDmyDate(value) ?? DEFAULT_DOB;

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setOpen(false);
      onBlur?.();
      if (event.type === "set" && date) {
        onChange(dateToDmy(date));
      }
    },
    [onBlur, onChange],
  );

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={!editable}
        onPress={() => {
          onFocus?.();
          setOpen(true);
        }}
        style={styles.trigger}
        testID={testID}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value || "DD-MM-YYYY"}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          maximumDate={maxToday ? new Date() : undefined}
          mode="date"
          onChange={handleChange}
          value={selected}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    justifyContent: "center",
    minHeight: 24,
  },
  value: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
  },
  placeholder: {
    color: "#7F7F7F",
    fontFamily: typography.family,
    fontSize: 16,
  },
});
