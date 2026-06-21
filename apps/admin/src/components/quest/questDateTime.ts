export const BANGKOK_TIMEZONE_LABEL = "Bangkok time (UTC+7)";

const BANGKOK_OFFSET_MINUTES = 7 * 60;
const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toBangkokDateTimeInput(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const bangkokDate = new Date(
    date.getTime() + BANGKOK_OFFSET_MINUTES * 60_000,
  );

  return [
    bangkokDate.getUTCFullYear(),
    "-",
    pad2(bangkokDate.getUTCMonth() + 1),
    "-",
    pad2(bangkokDate.getUTCDate()),
    "T",
    pad2(bangkokDate.getUTCHours()),
    ":",
    pad2(bangkokDate.getUTCMinutes()),
  ].join("");
}

export function bangkokDateTimeInputToISOString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = DATETIME_LOCAL_RE.exec(trimmed);
  if (!match) return trimmed;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const bangkokAsUtcMillis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return new Date(
    bangkokAsUtcMillis - BANGKOK_OFFSET_MINUTES * 60_000,
  ).toISOString();
}
