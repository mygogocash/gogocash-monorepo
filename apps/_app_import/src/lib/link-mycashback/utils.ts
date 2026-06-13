/** Same as sign-in `LoginComponent` phone field: strip non-digits, cap at 10. */
export function phoneLocalDigitsFromInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Matches sign-in OTP countdown display, e.g. `(00:60)`. */
export function formatOtpCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `(${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")})`;
}

export function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at >= trimmed.length - 1) {
    return "****";
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = local[0] ?? "*";
  return `${first}***@${domain}`;
}
