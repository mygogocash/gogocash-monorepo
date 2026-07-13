import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { resolveDatePickerTimeOptions } from "@/lib/adminDateTimeFormat";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;
import Instance = flatpickr.Instance;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  onValueChange?: (value: string) => void;
  defaultDate?: DateOption;
  value?: DateOption;
  minDate?: DateOption;
  maxDate?: DateOption;
  enableTime?: boolean;
  dateFormat?: string;
  altFormat?: string;
  altInput?: boolean;
  staticPosition?: boolean;
  /** @deprecated Ignored when `enableTime` is true — datetime pickers always use 24-hour English format. */
  time_24hr?: boolean;
  minuteIncrement?: number;
  label?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  name?: string;
  disabled?: boolean;
  /** Marks the field required — renders a `*` marker on the label. */
  required?: boolean;
};

const defaultInputClass =
  "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800";

export default function DatePicker({
  id,
  mode,
  onChange,
  onValueChange,
  label,
  defaultDate,
  value,
  minDate,
  maxDate,
  enableTime = false,
  dateFormat = "Y-m-d",
  altFormat,
  altInput = false,
  staticPosition,
  minuteIncrement = 5,
  placeholder,
  className,
  ariaLabel,
  name,
  hint,
  disabled = false,
  required = false,
}: PropsType) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onChangeRef = useRef<PropsType["onChange"]>(onChange);
  const onValueChangeRef = useRef<PropsType["onValueChange"]>(onValueChange);
  const { altFormat: resolvedAltFormat, time_24hr: resolvedTime24hr } =
    resolveDatePickerTimeOptions(enableTime, altFormat);

  useEffect(() => {
    onChangeRef.current = onChange;
    onValueChangeRef.current = onValueChange;
  }, [onChange, onValueChange]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.classList.remove("hidden");
    inputRef.current.style.removeProperty("display");
    const useStaticPosition = staticPosition ?? !enableTime;
    const decorateGeneratedCalendarInputs = (instance: Instance) => {
      const calendar = instance.calendarContainer;
      if (!calendar) return;

      calendar
        .querySelectorAll<HTMLInputElement>("input")
        .forEach((calendarInput, index) => {
          const generatedId = `${id}-calendar-input-${index}`;
          if (!calendarInput.id) {
            calendarInput.id = generatedId;
          }
          if (!calendarInput.name) {
            calendarInput.name = generatedId;
          }
        });
    };
    const keepCalendarInViewport = (instance: Instance) => {
      if (useStaticPosition) return;
      window.requestAnimationFrame(() => {
        const calendar = instance.calendarContainer;
        if (!calendar) return;
        const rect = calendar.getBoundingClientRect();
        const viewportPadding = 16;
        const maxBottom = window.innerHeight - viewportPadding;

        if (rect.bottom <= maxBottom && rect.top >= viewportPadding) return;

        const top = Math.max(
          viewportPadding,
          Math.min(
            rect.top,
            window.innerHeight - rect.height - viewportPadding,
          ),
        );
        calendar.style.top = `${window.scrollY + top}px`;
      });
    };

    const flatPickr = flatpickr(inputRef.current, {
      mode: mode || "single",
      static: useStaticPosition,
      disableMobile: true,
      monthSelectorType: "static",
      enableTime,
      dateFormat,
      altFormat: resolvedAltFormat,
      altInput,
      time_24hr: resolvedTime24hr,
      minuteIncrement,
      defaultDate: value ?? defaultDate,
      minDate,
      maxDate,
      clickOpens: !disabled,
      onReady: (_, __, instance) => {
        if (instance.altInput) {
          inputRef.current?.setAttribute("id", `${id}-value`);
          inputRef.current?.setAttribute("aria-hidden", "true");
          inputRef.current?.removeAttribute("aria-label");
          inputRef.current?.setAttribute("tabindex", "-1");
          if (inputRef.current) {
            inputRef.current.style.display = "none";
          }
          instance.altInput.setAttribute("id", id);
          instance.altInput.classList.remove("hidden");
          instance.altInput.style.removeProperty("display");
          instance.altInput.disabled = disabled;
          if (ariaLabel) {
            instance.altInput.setAttribute("aria-label", ariaLabel);
          }
        }
        decorateGeneratedCalendarInputs(instance);
        keepCalendarInViewport(instance);
      },
      onOpen: (_, __, instance) => {
        decorateGeneratedCalendarInputs(instance);
        keepCalendarInViewport(instance);
      },
      onMonthChange: (_, __, instance) => {
        decorateGeneratedCalendarInputs(instance);
        keepCalendarInViewport(instance);
      },
      onYearChange: (_, __, instance) => {
        decorateGeneratedCalendarInputs(instance);
        keepCalendarInViewport(instance);
      },
      onChange: (selectedDates, dateStr, instance) => {
        onValueChangeRef.current?.(dateStr);
        const handlers = onChangeRef.current;
        if (Array.isArray(handlers)) {
          handlers.forEach((handler) =>
            handler(selectedDates, dateStr, instance),
          );
        } else {
          handlers?.(selectedDates, dateStr, instance);
        }
      },
    });
    pickerRef.current = Array.isArray(flatPickr) ? flatPickr[0] : flatPickr;

    return () => {
      pickerRef.current?.destroy();
      pickerRef.current = null;
    };
  }, [
    altFormat,
    altInput,
    ariaLabel,
    dateFormat,
    defaultDate,
    disabled,
    enableTime,
    id,
    maxDate,
    minDate,
    minuteIncrement,
    mode,
    resolvedAltFormat,
    resolvedTime24hr,
    staticPosition,
    value,
  ]);

  return (
    <div>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          className={className ?? defaultInputClass}
        />

        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
}
