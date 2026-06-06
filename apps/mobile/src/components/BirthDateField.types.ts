// Shared prop contract for the platform-split BirthDateField:
//   BirthDateField.tsx        → web (browser <input type="date"> calendar)
//   BirthDateField.native.tsx → native (@react-native-community/datetimepicker)
// The field speaks the app's DD-MM-YYYY string format (value in, value out) so the shared
// validators (parseDmyDate / isValidBirthdate / isOver20) stay unchanged across platforms.
export type BirthDateFieldProps = {
  /** Current value as a DD-MM-YYYY string ("" when unset). */
  value: string;
  /** Emits the picked date as a DD-MM-YYYY string ("" when cleared). */
  onChange: (value: string) => void;
  /** Accessible name for the field (the screens already localize this). */
  accessibilityLabel: string;
  /** When false the picker is disabled (e.g. the profile form when not editing). */
  editable?: boolean;
  /** Cap the selectable date to today (birthdates can't be in the future). Defaults true. */
  maxToday?: boolean;
  /** Forwarded focus handlers so the screens can keep their green focus-border affordance. */
  onFocus?: () => void;
  onBlur?: () => void;
  testID?: string;
};
