/**
 * Account Setup onboarding — shared types.
 *
 * The screen is a step machine. Paths:
 *  - registered_phone:   intro → (submit) → home (direct submit from intro)
 *  - other_phone:        intro → op_input → op_otp → op_name → (submit) → home
 *  - citizen_id:         intro → ci_input → ci_name → (submit) → home
 *
 * Figma: 9756-214495 (overview) · 9022-914403 (primary frame)
 */

/** Which PromptPay identity the user picked on the intro step. */
export type PromptPayChoice = "registered_phone" | "other_phone" | "citizen_id";

/** Finite set of step ids across all sub-flows. */
export type AccountSetupStep = "intro" | "op_input" | "op_otp" | "op_name" | "ci_input" | "ci_name";

/** User-entered values held by the orchestrator and handed to each step component. */
export type AccountSetupFormState = {
  choice: PromptPayChoice;
  /** Raw digits (no country code) for the "other phone" flow. */
  otherPhoneDigits: string;
  /** OTP typed by the user on the other-phone OTP step. */
  otpInput: string;
  /** 13-digit Thai national ID for the citizen-id flow. */
  citizenIdDigits: string;
  /** First + last name required for PromptPay account holder confirmation. */
  firstName: string;
  lastName: string;
};

export const EMPTY_ACCOUNT_SETUP_FORM: AccountSetupFormState = {
  choice: "registered_phone",
  otherPhoneDigits: "",
  otpInput: "",
  citizenIdDigits: "",
  firstName: "",
  lastName: "",
};
