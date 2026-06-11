/**
 * Builds an E.164 phone number from a dial code and locally-entered digits.
 *
 * Thai users type their number with the leading trunk zero ("0812346789");
 * E.164 requires it dropped after the country code ("+66812346789").
 * Exactly one leading zero is stripped — anything beyond that is the
 * user's input to correct, not ours to guess.
 */
export function toPhoneE164(dialCode: string, localDigits: string): string {
  return `${dialCode}${localDigits.replace(/^0/, "")}`;
}
