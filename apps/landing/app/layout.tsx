import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import { CustomerIoFormsScript } from "@/components/customer-io-forms-script";
import { LineTagScripts } from "@/components/line-tag-scripts";
import { AppClientProviders } from "@/components/app-client-providers";
import SchemaMarkup from "@/components/schema-markup";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";
import {
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SOCIAL_PREVIEW_DESCRIPTION,
  SOCIAL_PREVIEW_TITLE,
} from "@/lib/social-preview";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

function metadataBaseUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined,
    "https://gogocash.co",
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      return new URL(raw);
    } catch {
      /* try next candidate */
    }
  }
  return new URL("https://gogocash.co");
}

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#10b981",
  colorScheme: "light",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: SOCIAL_PREVIEW_TITLE,
  description: SOCIAL_PREVIEW_DESCRIPTION,
  keywords: [
    "GoGoCash",
    "cashback",
    "Shopee",
    "Lazada",
    "Agoda",
    "Southeast Asia",
    "shopping rewards",
  ],
  authors: [{ name: "GoGoCash" }],
  creator: "GoGoCash",
  metadataBase: metadataBaseUrl(),
  alternates: {
    canonical: "/",
    languages: HREFLANG_LANDING_ALTERNATES,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteOrigin(),
    siteName: "GoGoCash",
    title: SOCIAL_PREVIEW_TITLE,
    description: SOCIAL_PREVIEW_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_PREVIEW_TITLE,
    description: SOCIAL_PREVIEW_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <SchemaMarkup />
      </head>
      <body className="font-sans antialiased bg-white text-gray-800">
        <CustomerIoFormsScript />
        <LineTagScripts />
        <AppClientProviders>{children}</AppClientProviders>
      </body>
    </html>
  );
}
