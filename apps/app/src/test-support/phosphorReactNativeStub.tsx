import { createElement } from "react";
import { View } from "react-native";

// Test stub for phosphor-react-native (render-test config only). The real package
// ships ESM with extensionless internal imports that vitest cannot resolve, and
// the app imports icons via deep default paths
// ("phosphor-react-native/lib/module/icons/<Name>"). The render config aliases
// EVERY phosphor path to this single module via regex, so the default export must
// satisfy all those default imports. Icons are leaf presentational nodes
// irrelevant to render smoke tests, so each is a trivial View. Never bundled into
// the app.
function StubIcon(props: Record<string, unknown>) {
  return createElement(View, { accessible: false, ...props });
}

export default StubIcon;
export const Icon = StubIcon;
