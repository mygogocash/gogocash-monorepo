import { useRef } from "react";

export function RefsFixture() {
  const elementRef = useRef<HTMLDivElement>(null);

  return <div ref={elementRef}>{elementRef.current?.textContent}</div>;
}
