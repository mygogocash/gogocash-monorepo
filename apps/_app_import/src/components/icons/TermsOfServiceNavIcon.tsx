import { Scale } from "lucide-react";
import { forwardRef } from "react";
import type { SVGProps } from "react";

/** Scales — terms of service / binding legal agreement. */
const TermsOfServiceNavIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function TermsOfServiceNavIcon({ stroke = "#00AA80", width = 24, height = 24, ...props }, ref) {
    return (
      <Scale
        ref={ref}
        width={width}
        height={height}
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
        aria-hidden
        {...props}
      />
    );
  }
);

export default TermsOfServiceNavIcon;
