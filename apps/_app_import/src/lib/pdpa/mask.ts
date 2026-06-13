/** Non-production PII masking helpers (มาตรา 37 hygiene). */

export function maskEmail(email: string): string {
  const [a, domain] = email.split("@");
  if (!domain || a === undefined) return "***";
  const head = a.slice(0, 1);
  return `${head}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `***-***-${d.slice(-4)}`;
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => (p.length ? `${p[0]}***` : "")).join(" ");
}

export function maskUserData<T extends { email?: string; mobile?: string; username?: string }>(
  user: T
): T {
  return {
    ...user,
    email: user.email ? maskEmail(user.email) : user.email,
    mobile: user.mobile ? maskPhone(user.mobile) : user.mobile,
    username: user.username ? maskName(user.username) : user.username,
  };
}
