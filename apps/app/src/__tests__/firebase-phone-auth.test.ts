// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPhoneOtpRecaptcha,
  FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE,
  sendPhoneOtp,
} from "@mobile/auth/firebasePhoneAuth";
import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";

const platformOS = vi.hoisted(() => ({ current: "web" as string }));
const recaptchaMockState = vi.hoisted(() => ({
  delayedInjections: [] as Array<() => void>,
  mode: "sync" as "sync" | "manual" | "throw",
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return platformOS.current;
    },
  },
}));

const signInWithPhoneNumber = vi.fn();
const recaptchaVerifierCtor = vi.fn();
const recaptchaVerifierClear = vi.fn();

vi.mock("firebase/auth", () => ({
  RecaptchaVerifier: class RecaptchaVerifier {
    clear = recaptchaVerifierClear;
    constructor(...args: unknown[]) {
      recaptchaVerifierCtor(...args);
      if (recaptchaMockState.mode === "throw") {
        throw new Error("constructor failed");
      }

      const container = args[1];
      const parameters = args[2] as { badge?: string } | undefined;
      if (container instanceof HTMLElement) {
        const inject = () => {
          // With `badge: "inline"`, Google's visible iframe is owned by the
          // container passed to RecaptchaVerifier instead of a body-level,
          // fixed bottom-right wrapper.
          const badge = document.createElement("div");
          badge.className = "grecaptcha-badge";
          badge.dataset.style = parameters?.badge ?? "bottomright";
          const frame = document.createElement("iframe");
          frame.title = "reCAPTCHA";
          frame.setAttribute("src", "about:blank#/recaptcha/enterprise/anchor");
          badge.appendChild(frame);
          container.appendChild(badge);
        };

        if (recaptchaMockState.mode === "sync") inject();
        else recaptchaMockState.delayedInjections.push(inject);
      }
    }
  },
  signInWithPhoneNumber: (...args: unknown[]) => signInWithPhoneNumber(...args),
}));

const getClientAuth = vi.fn(() => ({ kind: "auth" }));
const isFirebaseConfigured = vi.fn(() => true);

vi.mock("@mobile/auth/firebaseClient", () => ({
  getClientAuth: () => getClientAuth(),
  isFirebaseConfigured: () => isFirebaseConfigured(),
}));

function runDelayedRecaptchaInjections(): void {
  for (const inject of recaptchaMockState.delayedInjections.splice(0)) {
    inject();
  }
}

function appendFirebaseShapedBadge(
  root: Element,
  style = "bottomright",
): HTMLElement {
  const badge = document.createElement("div");
  badge.className = "grecaptcha-badge";
  badge.dataset.style = style;
  if (style === "none") badge.style.visibility = "hidden";
  const frame = document.createElement("iframe");
  frame.title = "reCAPTCHA";
  frame.setAttribute("src", "about:blank#/recaptcha/enterprise/anchor");
  badge.appendChild(frame);
  root.appendChild(badge);
  return badge;
}

describe("firebasePhoneAuth > sendPhoneOtp", () => {
  beforeEach(() => {
    clearPhoneOtpRecaptcha();
    document.getElementById("gogocash-phone-recaptcha-placement")?.remove();
    platformOS.current = "web";
    recaptchaMockState.delayedInjections.length = 0;
    recaptchaMockState.mode = "sync";
    signInWithPhoneNumber.mockReset();
    recaptchaVerifierCtor.mockReset();
    recaptchaVerifierClear.mockReset();
    isFirebaseConfigured.mockReturnValue(true);
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    document.body.innerHTML = "";
  });

  it("given native platform without an application verifier > then throws a clear error", async () => {
    platformOS.current = "android";

    await expect(sendPhoneOtp("+66812345678")).rejects.toThrow(
      FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE,
    );
    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("given native platform with an application verifier > then calls signInWithPhoneNumber with it", async () => {
    platformOS.current = "ios";
    const verifier = { type: "recaptcha", verify: vi.fn() };

    await sendPhoneOtp("+66812345678", verifier);

    expect(signInWithPhoneNumber).toHaveBeenCalledWith(
      getClientAuth(),
      "+66812345678",
      verifier,
    );
  });

  it("given Firebase is not configured > then throws with the not-configured code", async () => {
    platformOS.current = "android";
    isFirebaseConfigured.mockReturnValue(false);
    const verifier = { type: "recaptcha", verify: vi.fn() };

    await expect(sendPhoneOtp("+66812345678", verifier)).rejects.toMatchObject({
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  });

  it("given successful web sends > then removes each owned inline verifier before returning", async () => {
    await sendPhoneOtp("+66812345678");
    await sendPhoneOtp("+66812345678");

    expect(
      document.querySelector('[data-gogocash-recaptcha="phone-otp"]'),
    ).toBeNull();
    expect(document.querySelector(".grecaptcha-badge")).toBeNull();
    expect(recaptchaVerifierCtor).toHaveBeenCalledTimes(2);
    expect(recaptchaVerifierCtor).toHaveBeenCalledWith(
      getClientAuth(),
      expect.any(HTMLElement),
      { badge: "inline", size: "invisible" },
    );
    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(2);
    expect(signInWithPhoneNumber).toHaveBeenCalledTimes(2);
  });

  it("given a failed web send > then removes the inline badge and owned container", async () => {
    signInWithPhoneNumber.mockRejectedValueOnce(new Error("send failed"));

    await expect(sendPhoneOtp("+66812345678")).rejects.toThrow("send failed");

    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[data-gogocash-recaptcha="phone-otp"]'),
    ).toBeNull();
    expect(document.querySelector(".grecaptcha-badge")).toBeNull();
  });

  it("given overlapping sends > then each owner clears only its inline verifier", async () => {
    let resolveFirst!: (value: { confirm: ReturnType<typeof vi.fn> }) => void;
    let resolveSecond!: (value: { confirm: ReturnType<typeof vi.fn> }) => void;
    const firstResult = new Promise<{ confirm: ReturnType<typeof vi.fn> }>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );
    const secondResult = new Promise<{ confirm: ReturnType<typeof vi.fn> }>(
      (resolve) => {
        resolveSecond = resolve;
      },
    );
    signInWithPhoneNumber
      .mockImplementationOnce(() => firstResult)
      .mockImplementationOnce(() => secondResult);
    const firstOwner = {};
    const secondOwner = {};

    const firstSend = sendPhoneOtp("+66812345678", undefined, firstOwner);
    const secondSend = sendPhoneOtp("+66812345678", undefined, secondOwner);

    expect(
      document.querySelectorAll('.grecaptcha-badge[data-style="inline"]'),
    ).toHaveLength(2);
    clearPhoneOtpRecaptcha(firstOwner);
    expect(
      document.querySelectorAll('.grecaptcha-badge[data-style="inline"]'),
    ).toHaveLength(1);
    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(1);

    resolveFirst({ confirm: vi.fn() });
    await firstSend;
    expect(
      document.querySelectorAll('.grecaptcha-badge[data-style="inline"]'),
    ).toHaveLength(1);

    resolveSecond({ confirm: vi.fn() });
    await secondSend;
    expect(
      document.querySelectorAll('.grecaptcha-badge[data-style="inline"]'),
    ).toHaveLength(0);
    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(2);
  });

  it("given an unrelated CAPTCHA mounts during a phone send > then phone cleanup preserves it", async () => {
    let resolveSend!: (value: { confirm: ReturnType<typeof vi.fn> }) => void;
    signInWithPhoneNumber.mockImplementationOnce(
      () =>
        new Promise<{ confirm: ReturnType<typeof vi.fn> }>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const send = sendPhoneOtp("+66812345678");
    const unrelatedRoot = document.createElement("div");
    unrelatedRoot.dataset.owner = "unrelated-firebase-flow";
    const unrelatedBadge = appendFirebaseShapedBadge(unrelatedRoot);
    const unrelatedForm = document.createElement("form");
    unrelatedRoot.appendChild(unrelatedForm);
    document.body.appendChild(unrelatedRoot);

    resolveSend({ confirm: vi.fn() });
    await send;

    expect(document.body.contains(unrelatedRoot)).toBe(true);
    expect(unrelatedRoot.contains(unrelatedBadge)).toBe(true);
    expect(unrelatedRoot.contains(unrelatedForm)).toBe(true);
  });

  it("given Firebase's separate Enterprise widget is hidden > then phone cleanup leaves it provider-managed", async () => {
    const providerRoot = document.createElement("div");
    const providerBadge = appendFirebaseShapedBadge(providerRoot, "none");
    document.body.appendChild(providerRoot);

    await sendPhoneOtp("+66812345678");

    expect(document.body.contains(providerRoot)).toBe(true);
    expect(providerRoot.contains(providerBadge)).toBe(true);
    expect(providerBadge.style.visibility).toBe("hidden");
  });

  it("given owner cleanup happens before inline rendering > then delayed content stays detached", async () => {
    recaptchaMockState.mode = "manual";
    let resolveSend!: (value: { confirm: ReturnType<typeof vi.fn> }) => void;
    signInWithPhoneNumber.mockImplementationOnce(
      () =>
        new Promise<{ confirm: ReturnType<typeof vi.fn> }>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const owner = {};
    const send = sendPhoneOtp("+66812345678", undefined, owner);

    clearPhoneOtpRecaptcha(owner);
    runDelayedRecaptchaInjections();
    expect(
      document.querySelector('[data-gogocash-recaptcha="phone-otp"]'),
    ).toBeNull();
    expect(document.querySelector(".grecaptcha-badge")).toBeNull();

    resolveSend({ confirm: vi.fn() });
    await send;
    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(1);
  });

  it("given the verifier constructor fails > then removes its owned container", async () => {
    recaptchaMockState.mode = "throw";

    await expect(sendPhoneOtp("+66812345678")).rejects.toThrow(
      "constructor failed",
    );

    expect(
      document.querySelector('[data-gogocash-recaptcha="phone-otp"]'),
    ).toBeNull();
    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("positions owned and Enterprise verifiers above the mobile bottom nav", async () => {
    await sendPhoneOtp("+66812345678");

    const style = document.getElementById("gogocash-phone-recaptcha-placement");
    expect(style?.textContent).toContain(
      '[data-gogocash-recaptcha="phone-otp"]',
    );
    expect(style?.textContent).toContain("@media (max-width: 1023px)");
    expect(style?.textContent).toContain(
      "bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important",
    );
    expect(style?.textContent).toContain(
      '.grecaptcha-badge[data-style="bottomright"]',
    );
  });
});

describe("firebasePhoneAuth > confirmPhoneOtp", () => {
  it("given a valid confirmation > then returns the Firebase ID token", async () => {
    const confirm = vi.fn().mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue("firebase-id-token") },
    });

    const { confirmPhoneOtp } = await import("@mobile/auth/firebasePhoneAuth");

    // No cast: confirmPhoneOtp accepts the minimal PhoneOtpConfirmation shape,
    // which both firebase/auth (web) and @react-native-firebase/auth (native)
    // confirmations satisfy structurally.
    await expect(confirmPhoneOtp({ confirm }, "123456")).resolves.toEqual({
      idToken: "firebase-id-token",
    });
    expect(confirm).toHaveBeenCalledWith("123456");
  });

  it("given confirm resolves null (RNFB contract) > then throws a clear error, not a null crash", async () => {
    // @react-native-firebase/auth types confirm() as Promise<UserCredential | null>.
    const confirm = vi.fn().mockResolvedValue(null);

    const { confirmPhoneOtp, PHONE_OTP_NO_CREDENTIAL_MESSAGE } =
      await import("@mobile/auth/firebasePhoneAuth");

    expect(PHONE_OTP_NO_CREDENTIAL_MESSAGE).toBe(
      "Phone sign-in did not return a credential.",
    );
    await expect(confirmPhoneOtp({ confirm }, "123456")).rejects.toThrow(
      "Phone sign-in did not return a credential.",
    );
  });
});

describe("invisible captcha wiring (source signals)", () => {
  it("the auth screen does not mount or preload an always-visible captcha", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const screenSource = readFileSync(
      resolve(__dirname, "../screens/CustomerAuthScreen.tsx"),
      "utf8",
    );

    expect(screenSource).not.toContain("RECAPTCHA_INLINE_CONTAINER_ID");
    expect(screenSource).not.toContain("preloadInlineRecaptcha");
  });
});
