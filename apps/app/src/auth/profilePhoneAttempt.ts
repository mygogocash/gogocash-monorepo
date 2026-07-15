import type { PhoneOtpConfirmation } from "@mobile/auth/firebasePhoneAuth";

export type ProfilePhoneAttempt = {
  confirmation: PhoneOtpConfirmation;
  maskedDestination: string;
  phoneE164: string;
};

// Firebase's confirmation handle is intentionally non-serializable. Keeping it
// in module memory lets the two profile routes share one attempt without
// putting the phone number or credential in a URL or persistent storage.
let activeAttempt: ProfilePhoneAttempt | null = null;

export function setProfilePhoneAttempt(attempt: ProfilePhoneAttempt): void {
  activeAttempt = attempt;
}

export function getProfilePhoneAttempt(): ProfilePhoneAttempt | null {
  return activeAttempt;
}

export function clearProfilePhoneAttempt(): void {
  activeAttempt = null;
}

export function maskPhoneE164(phoneE164: string): string {
  const lastFour = phoneE164.slice(-4);
  const countryCode = phoneE164.startsWith("+66")
    ? "+66"
    : phoneE164.slice(0, 3);
  return `${countryCode} ••• ••• ${lastFour}`;
}
