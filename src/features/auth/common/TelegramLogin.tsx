"use client";

import { env } from "@/env";
import { useEffect } from "react";

export default function TelegramLogin() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute(
      "data-telegram-login",
      env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YourBotName_bot"
    );
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", `${env.NEXT_PUBLIC_FRONTEND_URL}/login`);
    script.setAttribute("data-userpic", "true");

    document.getElementById("telegram-login")?.appendChild(script);
  }, []);

  return <div id="telegram-login"></div>;
}
