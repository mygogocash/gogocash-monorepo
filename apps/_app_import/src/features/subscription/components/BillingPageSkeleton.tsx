/** Static skeleton for `/billing` — safe as Suspense fallback (no hooks). */
export default function BillingPageSkeleton() {
  return (
    <div className="gc-page-block">
      <div className="container max-w-[560px]">
        <div className="gc-surface-card p-6" style={{ borderRadius: "var(--gc-radius-lg)" }}>
          <div className="gc-skeleton mb-4" style={{ height: 20, width: "66%", maxWidth: 240 }} />
          <div className="gc-skeleton mb-6" style={{ height: 40, width: 112 }} />
          <div className="gc-skeleton mb-2" style={{ height: 12, width: "100%", maxWidth: 320 }} />
          <div className="gc-skeleton mb-2" style={{ height: 12, width: "100%", maxWidth: 280 }} />
          <div className="gc-skeleton" style={{ height: 12, width: "100%", maxWidth: 200 }} />
        </div>
      </div>
    </div>
  );
}
