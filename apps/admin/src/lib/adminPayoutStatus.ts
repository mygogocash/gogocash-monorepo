export type AdminPayoutStatus = "Pending" | "Given" | "Schedule" | "Fail";

export const ADMIN_PAYOUT_STATUS_OPTIONS: {
  value: AdminPayoutStatus;
  label: AdminPayoutStatus;
}[] = [
  { value: "Pending", label: "Pending" },
  { value: "Given", label: "Given" },
  { value: "Schedule", label: "Schedule" },
  { value: "Fail", label: "Fail" },
];

export function resolveAdminPayoutStatus(
  formStatus: AdminPayoutStatus,
  apiSuccess: boolean,
): AdminPayoutStatus {
  if (!apiSuccess) return "Fail";
  return formStatus;
}

export function adminPayoutStatusClass(status: AdminPayoutStatus): string {
  switch (status) {
    case "Pending":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "Given":
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
    case "Schedule":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300";
    case "Fail":
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export const ADMIN_PAYOUT_STATUS_HELP_POINTS =
  "Pending — waiting for approval. Given — approved and user received points. Schedule — approved and waiting for given date. Fail — points could not be credited.";

export const ADMIN_PAYOUT_STATUS_HELP_REWARD =
  "Pending — waiting for approval. Given — approved and user received reward. Schedule — approved and waiting for given date. Fail — reward could not be delivered.";
