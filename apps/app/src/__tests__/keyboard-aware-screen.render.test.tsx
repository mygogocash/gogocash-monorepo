import { createElement } from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";

// Render coverage for the A4 keyboard-aware form wrapper. It composes
// KeyboardAvoidingView + ScrollView; under the render harness react-native ->
// react-native-web (happy-dom), so we assert it mounts, renders its children,
// and forwards `contentContainerStyle` onto the inner scroll content node.
// The ScrollView carries a stable testID so we can read the forwarded style off
// the rendered DOM element (react-native-web spreads contentContainerStyle onto
// the inner content div, whose parent is the testID-tagged scroll node).
describe("KeyboardAwareScreen (render)", () => {
  it("mounts without throwing", () => {
    expect(() =>
      render(createElement(KeyboardAwareScreen, { children: createElement(Text, {}, "Body") }))
    ).not.toThrow();
  });

  it("renders its children", () => {
    render(
      createElement(KeyboardAwareScreen, {
        children: createElement(Text, {}, "Keyboard aware child"),
      })
    );
    expect(screen.getByText("Keyboard aware child")).toBeTruthy();
  });

  it("forwards contentContainerStyle to the scroll view content", () => {
    render(
      createElement(KeyboardAwareScreen, {
        contentContainerStyle: { paddingBottom: 99 },
        children: createElement(Text, {}, "Body"),
      })
    );
    // react-native-web renders the ScrollView as an outer scroll node wrapping an
    // inner content div that receives contentContainerStyle. Reading the rendered
    // markup proves the prop was forwarded (paddingBottom: 99px surfaces in the DOM).
    expect(document.body.innerHTML).toContain("padding-bottom: 99px");
  });
});
