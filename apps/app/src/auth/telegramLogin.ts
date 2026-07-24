import { Platform } from "react-native";

import type { BackendLoginResponse } from "@mobile/auth/firebaseLogin";
import { mapLoginResponseToMobileSession } from "@mobile/auth/firebaseLogin";
import type { MobileSession } from "@mobile/auth/session";

export type TelegramAuthPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onGoGoCashTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

const TELEGRAM_WIDGET_SCRIPT = "https://telegram.org/js/telegram-widget.js?22";
const TELEGRAM_LOGIN_CONTAINER_ID = "gogocash-telegram-login-overlay";

export function getTelegramBotUsername(): string {
  return process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "";
}

export function isTelegramLoginConfigured(): boolean {
  return getTelegramBotUsername().length > 0;
}

/** Opens the official Telegram Login Widget overlay — web only. */
export function requestTelegramLogin(botUsername: string): Promise<TelegramAuthPayload> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return Promise.reject(new Error("Telegram login currently supports Expo web only."));
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TELEGRAM_LOGIN_CONTAINER_ID);
    existing?.remove();

    const overlay = document.createElement("div");
    overlay.id = TELEGRAM_LOGIN_CONTAINER_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Telegram sign in");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      zIndex: "9999",
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "relative",
      padding: "24px",
      borderRadius: "16px",
      backgroundColor: "#ffffff",
      boxShadow: "0 16px 40px rgba(16, 24, 40, 0.18)",
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close Telegram sign in");
    closeButton.textContent = "×";
    Object.assign(closeButton.style, {
      position: "absolute",
      top: "8px",
      right: "12px",
      border: "none",
      background: "transparent",
      fontSize: "24px",
      cursor: "pointer",
      lineHeight: "1",
    });

    const widgetHost = document.createElement("div");

    const cleanup = () => {
      delete window.onGoGoCashTelegramAuth;
      overlay.remove();
    };

    const cancel = () => {
      cleanup();
      reject(Object.assign(new Error("Popup closed"), { code: "auth/popup-closed-by-user" }));
    };

    closeButton.addEventListener("click", cancel);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cancel();
      }
    });

    window.onGoGoCashTelegramAuth = (user) => {
      cleanup();
      resolve(user);
    };

    const script = document.createElement("script");
    script.src = TELEGRAM_WIDGET_SCRIPT;
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onGoGoCashTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.onerror = () => {
      cleanup();
      reject(new Error("Telegram login widget failed to load"));
    };

    panel.appendChild(closeButton);
    panel.appendChild(widgetHost);
    widgetHost.appendChild(script);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}

export async function exchangeTelegramAuth({
  apiUrl,
  fetchImpl = fetch,
  payload,
}: {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  payload: TelegramAuthPayload;
}): Promise<MobileSession> {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/auth/log-in/telegram`, {
    // Telegram signs the complete callback payload. Forward it unchanged:
    // appending local metadata would make the API's HMAC contract ambiguous.
    body: JSON.stringify(payload),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json().catch(() => ({}))) as BackendLoginResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(body?.message || `Telegram login failed with status ${response.status}.`);
  }

  return mapLoginResponseToMobileSession(body);
}
