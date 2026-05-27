export type PromptPayChoice = "registered_phone" | "other_phone" | "citizen_id";

export type AccountSetupStep =
  | "intro"
  | "op_input"
  | "op_otp"
  | "op_name"
  | "ci_input"
  | "ci_name";

export type AccountSetupFormState = {
  choice: PromptPayChoice;
  citizenIdDigits: string;
  firstName: string;
  lastName: string;
  otpInput: string;
  otherPhoneDigits: string;
};

export const accountSetupMockOtp = "123456";

export const emptyAccountSetupForm: AccountSetupFormState = {
  choice: "registered_phone",
  citizenIdDigits: "",
  firstName: "",
  lastName: "",
  otpInput: "",
  otherPhoneDigits: "",
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskTail(phone: string | undefined): string {
  const digits = digitsOnly(phone ?? "");

  if (digits.length < 4) {
    return "";
  }

  return `***${digits.slice(-4)}`;
}

export function isThaiMobileValid(raw: string): boolean {
  const digits = digitsOnly(raw);

  if (digits.length === 10 && digits.startsWith("0")) {
    return true;
  }

  return digits.length === 9 && !digits.startsWith("0");
}

export function canonicalThaiMobile(raw: string): string {
  const digits = digitsOnly(raw);

  if (digits.length === 9 && !digits.startsWith("0")) {
    return `0${digits}`;
  }

  return digits;
}

export function isCitizenIdValid(raw: string): boolean {
  return digitsOnly(raw).length === 13;
}

export function isNameValid(name: string): boolean {
  return name.trim().length > 0;
}

export function isOtpValid(raw: string): boolean {
  return digitsOnly(raw) === accountSetupMockOtp;
}
