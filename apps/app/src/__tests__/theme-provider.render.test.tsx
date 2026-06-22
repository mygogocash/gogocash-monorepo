import { fireEvent, render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

type ThemePreference = "light" | "dark" | "system";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  useColorScheme: () => "light",
}));

vi.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

describe("ThemeProvider", () => {
  it("does not let late native storage hydration overwrite a newer user preference", async () => {
    vi.resetModules();

    let resolveHydration: ((value: ThemePreference | null) => void) | null =
      null;
    const storage = await import("@mobile/theme/themePreferenceStorage");
    vi.spyOn(storage, "readStoredThemePreferenceSync").mockReturnValue(null);
    vi.spyOn(storage, "readStoredThemePreference").mockImplementation(
      () =>
        new Promise<ThemePreference | null>((resolve) => {
          resolveHydration = resolve;
        }),
    );
    const writeStoredThemePreference = vi
      .spyOn(storage, "writeStoredThemePreference")
      .mockResolvedValue(undefined);

    const { ThemeProvider, useTheme } =
      await import("@mobile/theme/ThemeProvider");

    function ThemeProbe() {
      const { preference, resolved, setPreference } = useTheme();

      return (
        <button data-testid="theme-probe" onClick={() => setPreference("dark")}>
          {preference}:{resolved}
        </button>
      );
    }

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-probe").textContent).toBe("system:light");

    fireEvent.click(screen.getByTestId("theme-probe"));
    expect(screen.getByTestId("theme-probe").textContent).toBe("dark:dark");
    expect(writeStoredThemePreference).toHaveBeenCalledWith("dark");

    await act(async () => {
      resolveHydration?.("light");
      await Promise.resolve();
    });

    expect(screen.getByTestId("theme-probe").textContent).toBe("dark:dark");
  });
});
