import { LINK_CONNECTOR_DOTS } from "./constants";

export function LinkConnectorDots() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3" aria-hidden>
      {LINK_CONNECTOR_DOTS.map((dot, index) => (
        <span
          key={index}
          className={`gc-link-connector-dot shrink-0 rounded-full ${dot.className}`}
          style={{ animationDelay: `${dot.delayMs}ms` }}
        />
      ))}
    </div>
  );
}
