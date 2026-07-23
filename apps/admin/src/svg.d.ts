// svg.d.ts — SVGs import as React components via @svgr/webpack (next.config.ts
// wires the rule for both webpack and turbopack), so the DEFAULT export is the
// component: `import EyeIcon from "./eye.svg"` renders as JSX across src/icons.
// The previous CRA-style declaration (default = string URL, named
// ReactComponent = component) mistyped every icon; with the generated
// next-env.d.ts absent (CI runs typecheck before any next build) that produced
// 29 IntrinsicAttributes errors. Keep this the ONLY `*.svg` declaration.
declare module "*.svg" {
  import type * as React from "react";

  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}
