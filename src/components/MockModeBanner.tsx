import { shouldUseMockApi } from "@/lib/env";

/**
 * Persistent visual indicator that the app is running against in-memory mocks
 * rather than the real API. Renders nothing in production builds with a real
 * `NEXT_PUBLIC_API_URL`. Without this, a misconfigured prod deploy would
 * silently ship fake balances and fake offers.
 *
 * The banner is non-dismissable on purpose — anyone who needs to dismiss it
 * is also someone who can fix the env var.
 */
export default function MockModeBanner() {
  if (!shouldUseMockApi()) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483646,
        padding: "6px 12px",
        background: "#ff8a00",
        color: "#000",
        font: "600 12px/1.4 system-ui, -apple-system, sans-serif",
        textAlign: "center",
        letterSpacing: "0.02em",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }}
    >
      MOCK MODE — actions will not persist. Set NEXT_PUBLIC_API_URL to use the real API.
    </div>
  );
}
