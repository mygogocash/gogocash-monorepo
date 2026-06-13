/**
 * Withdrawal compliance: legal address + national ID / passport must be on file.
 * API may return camelCase or snake_case; `User.address` is the Web3 wallet — not used here.
 */
export function getWithdrawKycSnapshot(profile: unknown): {
  hasCitizenOrPassportId: boolean;
  hasLegalAddress: boolean;
} {
  if (!profile || typeof profile !== "object") {
    return { hasCitizenOrPassportId: false, hasLegalAddress: false };
  }
  const o = profile as Record<string, unknown>;
  const idRaw =
    o.id_number ??
    o.idNumber ??
    o.citizen_id ??
    o.citizenId ??
    o.national_id ??
    o.nationalId ??
    o.passport_number ??
    o.passportNumber;
  const addrRaw =
    o.legal_address ??
    o.legalAddress ??
    o.residential_address ??
    o.residentialAddress ??
    o.profile_address ??
    o.profileAddress;

  const idStr = typeof idRaw === "string" ? idRaw.trim() : "";
  const addrStr = typeof addrRaw === "string" ? addrRaw.trim() : "";
  return {
    hasCitizenOrPassportId: idStr.length > 0,
    hasLegalAddress: addrStr.length > 0,
  };
}

export function isWithdrawProfileKycComplete(profile: unknown): boolean {
  const s = getWithdrawKycSnapshot(profile);
  return s.hasCitizenOrPassportId && s.hasLegalAddress;
}
