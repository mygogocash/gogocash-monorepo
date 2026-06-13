import type { DataBreachLog } from "./types";

export interface PdpcNotificationDraft {
  title: string;
  sections: { heading: string; body: string }[];
}

/**
 * Draft PDPC notification content (มาตรา 37(3)) — human review before filing.
 */
export function generatePDPCNotification(breach: DataBreachLog): PdpcNotificationDraft {
  return {
    title: `Personal data breach notification — ${breach.breachId}`,
    sections: [
      {
        heading: "1. Nature of the breach",
        body: breach.description,
      },
      {
        heading: "2. Categories and approximate number of data subjects affected",
        body: String(breach.affectedUsers ?? "Unknown"),
      },
      {
        heading: "3. Categories and approximate number of records affected",
        body: (breach.dataCategories ?? []).join(", ") || "To be confirmed",
      },
      {
        heading: "4. Name and contact details of DPO / controller",
        body: "See privacy policy — DPO contact (to be completed by legal).",
      },
      {
        heading: "5. Likely consequences",
        body: `Severity: ${breach.severity}. Root cause: ${breach.rootCause ?? "Under investigation"}.`,
      },
      {
        heading: "6. Measures taken or proposed",
        body:
          (breach.containmentActions ?? [])
            .map((a) => `${a.timestamp}: ${a.action} (${a.performedBy})`)
            .join("\n") || "Containment in progress.",
      },
      {
        heading: "7. Measures to mitigate adverse effects",
        body: breach.userNotificationRequired
          ? "Affected users will be notified where required."
          : "Assessment pending.",
      },
    ],
  };
}
