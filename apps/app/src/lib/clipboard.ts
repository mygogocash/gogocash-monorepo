// Cross-platform clipboard copy (web + native), single source of truth.
//
// Screens previously called navigator.clipboard.writeText directly, which is a
// no-op on native iOS/Android (navigator is undefined there). This wrapper uses
// the web Clipboard API when available and falls back to expo-clipboard on
// native (lazy-imported so the Node test environment never loads it).
//
// Returns true if the text was copied, false otherwise — callers can use the
// result to drive a "Copied!" affordance. Never throws.

type WebClipboardLike = {
  writeText: (text: string) => Promise<void> | void;
};

export type CopyToClipboardOptions = {
  /** Override the web clipboard (defaults to globalThis.navigator.clipboard). */
  webClipboard?: WebClipboardLike;
  /** Override the native writer (defaults to a lazy expo-clipboard import). */
  nativeWriter?: (text: string) => Promise<void>;
};

function resolveWebClipboard(): WebClipboardLike | undefined {
  const nav = (globalThis as { navigator?: { clipboard?: WebClipboardLike } }).navigator;
  if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
    return nav.clipboard;
  }
  return undefined;
}

async function defaultNativeWriter(text: string): Promise<void> {
  const mod = (await import("expo-clipboard")) as {
    setStringAsync?: (value: string) => Promise<boolean>;
  };
  if (typeof mod.setStringAsync !== "function") {
    throw new Error("expo-clipboard setStringAsync is not available in this runtime.");
  }
  await mod.setStringAsync(text);
}

/**
 * Copy `text` to the clipboard. Tries the web Clipboard API first, then the
 * native writer. Resolves true on success, false if the text is empty or every
 * path fails. Never rejects.
 */
export async function copyToClipboard(
  text: string,
  options: CopyToClipboardOptions = {}
): Promise<boolean> {
  if (!text) {
    return false;
  }

  const webClipboard =
    "webClipboard" in options ? options.webClipboard : resolveWebClipboard();

  if (webClipboard?.writeText) {
    try {
      await webClipboard.writeText(text);
      return true;
    } catch {
      // fall through to the native writer
    }
  }

  const nativeWriter = options.nativeWriter ?? defaultNativeWriter;

  try {
    await nativeWriter(text);
    return true;
  } catch {
    return false;
  }
}
