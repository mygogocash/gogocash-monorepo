"use client";

import { useCrossmintReady } from "@/providers/CrossmintReadyContext";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  const { reset } = useCrossmintReady();
  const message = error instanceof Error ? error.message : String(error);

  const handleReset = () => {
    reset();
    resetErrorBoundary();
  };

  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{message}</pre>
      <button onClick={handleReset}>Try again</button>
    </div>
  );
}

const CrossmintErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { reset } = useCrossmintReady();

  return (
    <ErrorBoundary FallbackComponent={Fallback} onReset={reset} resetKeys={[reset]}>
      {children}
    </ErrorBoundary>
  );
};

export default CrossmintErrorBoundary;
