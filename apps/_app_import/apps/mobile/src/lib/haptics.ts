// Cross-platform haptic feedback (web + native), single source of truth.
//
// Thin wrapper over expo-haptics. On web (Platform.OS === "web") every method is a
// no-op — the native module is never loaded. On native, calls are wrapped in
// try/catch so a missing or failing native module never throws: haptics are
// cosmetic feedback (success/impact/error cues), so we fire-and-forget and
// silently degrade rather than surfacing an error to the caller.
//
// This module intentionally has NO static `react-native` import. Platform.OS is
// read through a lazy `import("react-native")` and expo-haptics is lazily imported
// too (mirroring i18n/localeStorage.ts's dynamic-import discipline). That keeps the
// node test environment — which cannot parse the Flow-typed react-native source —
// from ever loading react-native or the native binary, so the unit tests live in
// the fast source suite.

type ExpoHapticsModule = {
  notificationAsync: (type: unknown) => Promise<void>;
  impactAsync: (style?: unknown) => Promise<void>;
  NotificationFeedbackType: { Success: unknown; Error: unknown };
  ImpactFeedbackStyle: { Medium: unknown };
};

export type HapticsCallOptions = {
  /** Override the detected platform (defaults to a lazy react-native Platform.OS read). */
  platformOS?: string;
  /** Override the native module loader (defaults to a lazy expo-haptics import). */
  loadModule?: () => Promise<ExpoHapticsModule>;
};

async function defaultPlatformOS(): Promise<string> {
  // Lazy import so the node source suite never statically parses react-native.
  const rn = (await import("react-native")) as { Platform?: { OS?: string } };
  return rn.Platform?.OS ?? "web";
}

async function defaultLoadModule(): Promise<ExpoHapticsModule> {
  return (await import("expo-haptics")) as unknown as ExpoHapticsModule;
}

async function runHaptic(
  options: HapticsCallOptions,
  invoke: (mod: ExpoHapticsModule) => Promise<void>
): Promise<void> {
  try {
    const platformOS = options.platformOS ?? (await defaultPlatformOS());
    if (platformOS === "web") {
      return;
    }
    const loadModule = options.loadModule ?? defaultLoadModule;
    const mod = await loadModule();
    await invoke(mod);
  } catch {
    // Fire-and-forget: a missing/failing native haptics module must never throw.
  }
}

export const haptics = {
  /** Success notification haptic (e.g. OTP verified, withdraw confirmed). */
  success(options: HapticsCallOptions = {}): Promise<void> {
    return runHaptic(options, (mod) =>
      mod.notificationAsync(mod.NotificationFeedbackType.Success)
    );
  },
  /** Medium impact haptic (e.g. button press / selection confirm). */
  impact(options: HapticsCallOptions = {}): Promise<void> {
    return runHaptic(options, (mod) => mod.impactAsync(mod.ImpactFeedbackStyle.Medium));
  },
  /** Error notification haptic (e.g. failed action). */
  error(options: HapticsCallOptions = {}): Promise<void> {
    return runHaptic(options, (mod) =>
      mod.notificationAsync(mod.NotificationFeedbackType.Error)
    );
  },
};
