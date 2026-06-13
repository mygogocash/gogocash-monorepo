import { FileText } from "lucide-react";
import { forwardRef } from "react";
import type { SVGProps } from "react";

/** Document with text — terms of use. */
const TermsOfUseNavIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function TermsOfUseNavIcon({ stroke = "#00AA80", width = 24, height = 24, ...props }, ref) {
    return (
      <FileText
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

export default TermsOfUseNavIcon;
