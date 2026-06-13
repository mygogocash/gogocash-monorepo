import "@/app/globals.css";
import { Metadata } from "next";
import { METADATA, SITE_ICONS } from "@/constants/Metadata";
import { getLocale, getMessages } from "next-intl/server";
import ClientLayoutWrapper from "@/components/layouts/ClientLayoutWrapper";
import MiniAppBootstrap from "@/components/miniapp/MiniAppBootstrap";
import LocaleHtmlSync from "@/components/providers/LocaleHtmlSync";
import NextIntlClientProviderWithFallback from "@/components/providers/NextIntlClientProviderWithFallback";

export const metadata: Metadata = {
  title: METADATA.title,
  description: METADATA.description,
  manifest: "/site.webmanifest",
  icons: SITE_ICONS,
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

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  await params;
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProviderWithFallback locale={locale} messages={messages}>
      <LocaleHtmlSync />
      <MiniAppBootstrap />
      <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
    </NextIntlClientProviderWithFallback>
  );
}
