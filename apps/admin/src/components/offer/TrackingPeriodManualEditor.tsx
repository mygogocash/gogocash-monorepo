import {
  MAX_TRACKING_PERIOD_DAYS,
  MIN_TRACKING_PERIOD_DAYS,
  type TrackingPeriodFlowType,
} from "@/lib/offerTrackingPeriod";

type TrackingPeriodManualEditorProps = {
  mode: "auto" | "manual";
  flowType: TrackingPeriodFlowType;
  trackingDays: number | null;
  confirmDays: number | null;
  trackingSubtitle: string | null;
  confirmSubtitle: string | null;
  onTrackingDaysChange: (value: number | null) => void;
  onConfirmDaysChange: (value: number | null) => void;
  onTrackingSubtitleChange: (value: string | null) => void;
  onConfirmSubtitleChange: (value: string | null) => void;
};

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white";
const LABEL_CLASS =
  "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400";

function optionalNumber(value: string): number | null {
  return value ? Number(value) : null;
}

/**
 * Shared Create/Edit controls for cashback tracking-period values.
 *
 * In two-step mode, `confirmDays` and `confirmSubtitle` are the one visible
 * combined step because that is the field pair consumed by the customer/API
 * preview. The hidden tracking pair remains in parent state for a predictable
 * switch back to three-step.
 */
export function TrackingPeriodManualEditor({
  mode,
  flowType,
  trackingDays,
  confirmDays,
  trackingSubtitle,
  confirmSubtitle,
  onTrackingDaysChange,
  onConfirmDaysChange,
  onTrackingSubtitleChange,
  onConfirmSubtitleChange,
}: TrackingPeriodManualEditorProps) {
  const combined = flowType === "two_step";

  return (
    <>
      {mode === "manual" ? (
        <div className={`grid gap-4 ${combined ? "" : "sm:grid-cols-2"}`}>
          {!combined ? (
            <div>
              <label
                htmlFor="tracking-period-tracking-days"
                className={LABEL_CLASS}
              >
                Tracking window (days)
              </label>
              <input
                id="tracking-period-tracking-days"
                type="number"
                min={MIN_TRACKING_PERIOD_DAYS}
                max={MAX_TRACKING_PERIOD_DAYS}
                value={trackingDays ?? ""}
                onChange={(event) =>
                  onTrackingDaysChange(optionalNumber(event.target.value))
                }
                className={INPUT_CLASS}
              />
            </div>
          ) : null}
          <div>
            <label
              htmlFor="tracking-period-confirm-days"
              className={LABEL_CLASS}
            >
              {combined
                ? "Tracking and confirm window (days)"
                : "Confirm window (days)"}
            </label>
            <input
              id="tracking-period-confirm-days"
              type="number"
              min={MIN_TRACKING_PERIOD_DAYS}
              max={MAX_TRACKING_PERIOD_DAYS}
              value={confirmDays ?? ""}
              onChange={(event) =>
                onConfirmDaysChange(optionalNumber(event.target.value))
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : null}

      <div className={`grid gap-4 ${combined ? "" : "sm:grid-cols-2"}`}>
        {!combined ? (
          <div>
            <label
              htmlFor="tracking-period-tracking-subtitle"
              className={LABEL_CLASS}
            >
              Tracking subtitle
            </label>
            <input
              id="tracking-period-tracking-subtitle"
              type="text"
              maxLength={200}
              placeholder="from the following month"
              value={trackingSubtitle ?? ""}
              onChange={(event) =>
                onTrackingSubtitleChange(event.target.value || null)
              }
              className={INPUT_CLASS}
            />
          </div>
        ) : null}
        <div>
          <label
            htmlFor="tracking-period-confirm-subtitle"
            className={LABEL_CLASS}
          >
            {combined ? "Tracking and confirm subtitle" : "Confirm subtitle"}
          </label>
          <input
            id="tracking-period-confirm-subtitle"
            type="text"
            maxLength={200}
            placeholder="after validation"
            value={confirmSubtitle ?? ""}
            onChange={(event) =>
              onConfirmSubtitleChange(event.target.value || null)
            }
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </>
  );
}
