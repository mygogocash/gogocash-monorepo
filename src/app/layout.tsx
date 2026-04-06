import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { env } from "@/env";
import ProviderDefault from "@/providers/ProviderDefault";
import { METADATA } from "@/constants/Metadata";
import { anuphan, dmSans } from "@/lib/fonts";
import { routing } from "@/i18n/routing";
import {
  GoogleTagManagerHead,
  GoogleTagManagerNoScript,
} from "@/components/analytics/GoogleTagManager";
import MetaPixel from "@/components/analytics/MetaPixel";

function resolveMetadataBase(): URL {
  const fromEnv = env.NEXT_PUBLIC_FRONTEND_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      /* fall through */
    }
  }
  if (env.VERCEL_URL) {
    return new URL(`https://${env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#00CC99",
};

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: METADATA.title,
  description: METADATA.description,
  applicationName: "GoGoCash",
  manifest: "/site.webmanifest",
  icons: {
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: METADATA.title,
    description: METADATA.description,
    images: [
      {
        url: METADATA.banner,
        width: 800,
        height: 600,
      },
      {
        url: METADATA.banner,
        width: 1800,
        height: 1600,
        alt: "Og Image Alt",
      },
    ],
    siteName: "GoGoCash",
  },
  twitter: {
    card: "summary_large_image",
    title: METADATA.title,
    description: METADATA.description,
    images: [METADATA.banner],
  },
};

function resolveLocaleFromCookie(cookieValue: string | undefined): string {
  if (cookieValue && routing.locales.includes(cookieValue as (typeof routing.locales)[number])) {
    return cookieValue;
  }
  return routing.defaultLocale;
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<Record<string, never>>;
}>) {
  await params;

  const cookieStore = await cookies();
  const locale = resolveLocaleFromCookie(cookieStore.get("NEXT_LOCALE")?.value);

  return (
    <html lang={locale}>
      <head>
        <meta name="facebook-domain-verification" content="4tqyqamr33ektym9ra9hs4iivsjfy2" />
        <GoogleTagManagerHead />
        <MetaPixel />
      </head>
      <body
        className={`${dmSans.variable} ${anuphan.variable} antialiased ${locale === "th" ? "locale-th" : "locale-en"}`}
      >
        {/* PDPA / cookie consent: ConsentBanner lives in ClientLayoutWrapper (next-intl locale tree). */}
        <GoogleTagManagerNoScript />
        <ProviderDefault>{children}</ProviderDefault>
      </body>
    </html>
  );
}
