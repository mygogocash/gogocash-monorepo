import type { OfferPolicyMode } from "@/lib/offerPolicyMode";

type OfferPolicyModeSwitchProps = {
  mode: OfferPolicyMode;
  onChange: (mode: OfferPolicyMode) => void;
  disabled?: boolean;
  "aria-label": string;
  templateLabel: string;
  customLabel: string;
};

export function OfferPolicyModeSwitch({
  mode,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
  templateLabel,
  customLabel,
}: OfferPolicyModeSwitchProps) {
  const buttonClass = (value: OfferPolicyMode) =>
    `rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
      mode === value
        ? "border-brand-500 bg-brand-500 text-white"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
    }`;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex w-fit flex-wrap gap-2"
    >
      <button
        type="button"
        aria-pressed={mode === "template"}
        className={buttonClass("template")}
        disabled={disabled}
        onClick={() => onChange("template")}
      >
        {templateLabel}
      </button>
      <button
        type="button"
        aria-pressed={mode === "custom"}
        className={buttonClass("custom")}
        disabled={disabled}
        onClick={() => onChange("custom")}
      >
        {customLabel}
      </button>
    </div>
  );
}
