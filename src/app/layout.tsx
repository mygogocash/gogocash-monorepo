import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
import InternalMockBanner from "@/components/InternalMockBanner";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "GoGoCash Admin",
  manifest: "/site.webmanifest",
};

const themeInitScript = `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        {process.env.BUILD_FOR_FIREBASE === "1" ? (
          <meta name="gogocash-static-export" content="1" />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${outfit.className} min-h-screen pt-8 bg-white dark:bg-gray-900`} suppressHydrationWarning>
        <InternalMockBanner />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
