"use client";

import Button from "@/components/ui/button/Button";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function AdminQueryError({
  title = "Could not load data",
  message,
  onRetry,
}: Props) {
  return (
    <div
      className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
      role="alert"
    >
      <p className="font-medium">{title}</p>
      {message ? <p className="mt-1 opacity-90">{message}</p> : null}
      {onRetry ? (
        <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
