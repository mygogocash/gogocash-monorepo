"use client";

export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#ef4444",
        color: "#fff",
        textAlign: "center",
        padding: "4px 0",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        pointerEvents: "none",
      }}
    >
      ⚠ Admin Staging — Not Production
    </div>
  );
}
