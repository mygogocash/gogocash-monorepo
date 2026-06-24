import { MESSAGES } from "@mobile/i18n/messages";

export function catalogEnglish(copyKey: string): string {
  return MESSAGES.en[copyKey] ?? copyKey;
}
