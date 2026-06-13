// Strict DD-MM-YYYY birthdate parsing (the Thai-locale input format used by the profile and
// age-verification screens). The native Date constructor CANNOT parse "DD-MM-YYYY" — it returns an
// Invalid Date — so we parse the parts by hand. We also reject calendar roll-over (e.g. 31-02-2000 or
// 45-13-2026, which Date would silently normalize to a different day) so the validators only accept
// real calendar dates. Returns a UTC Date at midnight, or null when the input is malformed/invalid.
const DMY_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export function parseDmyDate(input: string): Date | null {
  const match = DMY_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

// DD-MM-YYYY (app/display format) <-> YYYY-MM-DD (the value an HTML <input type="date"> uses).
// Return "" on a malformed/empty input so callers can clear the field safely.
export function dmyToIso(ddmmyyyy: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export function isoToDmy(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

// Format a Date (e.g. from the native picker) as a DD-MM-YYYY string.
export function dateToDmy(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}
