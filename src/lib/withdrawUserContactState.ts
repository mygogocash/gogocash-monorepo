/** Max rows per contact type in the withdraw user editor (emails / phones). */
export const MAX_WITHDRAW_CONTACT_ROWS = 20;

export type UserContactRow = {
  clientId: string;
  value: string;
  /** False until OTP verified for values not already on file when edit started */
  otpVerified: boolean;
  otpInput: string;
  otpBusy: "idle" | "sending" | "verifying";
  contactMsg: string | null;
};

export type WithdrawUserEditDraft = {
  emailRows: UserContactRow[];
  mobileRows: UserContactRow[];
  fullName: string;
  gender: string;
  birthdate: string;
  wallet: string;
  gogopassActive: boolean;
};

export function createContactRow(value: string): UserContactRow {
  return {
    clientId:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    value,
    otpVerified: true,
    otpInput: "",
    otpBusy: "idle",
    contactMsg: null,
  };
}

export function ensureUserContactRows(rows: unknown): UserContactRow[] {
  if (
    Array.isArray(rows) &&
    rows.length > 0 &&
    typeof rows[0] === "object" &&
    rows[0] !== null &&
    "clientId" in (rows[0] as object)
  ) {
    return rows as UserContactRow[];
  }
  return [createContactRow("")];
}

export function mergeContactValue(
  row: UserContactRow,
  newValue: string,
  initialSet: ReadonlySet<string>,
  kind: "email" | "mobile",
): UserContactRow {
  const v = newValue.trim();
  if (!v) {
    return {
      ...row,
      value: newValue,
      otpVerified: true,
      otpInput: "",
      otpBusy: "idle",
      contactMsg: null,
    };
  }
  const key = kind === "email" ? v.toLowerCase() : v;
  const onFile = initialSet.has(key);
  return {
    ...row,
    value: newValue,
    otpVerified: onFile,
    otpInput: onFile ? row.otpInput : "",
    otpBusy: "idle",
    contactMsg: onFile ? row.contactMsg : null,
  };
}

export function rowNeedsOtp(
  row: UserContactRow,
  initialSet: ReadonlySet<string>,
  kind: "email" | "mobile",
): boolean {
  const v = row.value.trim();
  if (!v) return false;
  const key = kind === "email" ? v.toLowerCase() : v;
  if (initialSet.has(key)) return false;
  return !row.otpVerified;
}

/**
 * Whether a contact row should display a "Verified" mark.
 *
 * - An **on-file** value (present when editing started) is verified when its
 *   channel was already verified on the user record (`initialChannelVerified`).
 * - A **newly added** value is verified once it has passed OTP this session
 *   (`row.otpVerified`).
 */
export function contactRowVerified(
  row: UserContactRow,
  initialSet: ReadonlySet<string>,
  kind: "email" | "mobile",
  initialChannelVerified: boolean,
): boolean {
  const v = row.value.trim();
  if (!v) return false;
  const key = kind === "email" ? v.toLowerCase() : v;
  if (initialSet.has(key)) return initialChannelVerified;
  return row.otpVerified;
}

export function allContactsVerifiedForSave(
  rows: UserContactRow[],
  initialSet: ReadonlySet<string>,
  kind: "email" | "mobile",
): boolean {
  return rows.every((row) => {
    const v = row.value.trim();
    if (!v) return true;
    return !rowNeedsOtp(row, initialSet, kind);
  });
}

export function emptyWithdrawUserEditDraft(): WithdrawUserEditDraft {
  return {
    emailRows: [createContactRow("")],
    mobileRows: [createContactRow("")],
    fullName: "",
    gender: "",
    birthdate: "",
    wallet: "",
    gogopassActive: false,
  };
}
