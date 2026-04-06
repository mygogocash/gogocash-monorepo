import { Shield } from "lucide-react";
import { forwardRef } from "react";
import type { SVGProps } from "react";

/** Shield — privacy policy (distinct from age-verification shield + check). */
const PrivacyPolicyNavIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function PrivacyPolicyNavIcon({ stroke = "#00AA80", width = 24, height = 24, ...props }, ref) {
    return (
      <Shield
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

export default PrivacyPolicyNavIcon;
