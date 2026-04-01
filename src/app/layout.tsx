import type { Metadata, Viewport } from "next";
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

/** Mobile: readable scale, respect safe areas, allow pinch-zoom for accessibility. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const themeInitScript = `(function(){var r=document.documentElement;var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}})();`;

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
        <script
          // Inline in <head> runs before paint; avoids React treating <script> in <body> as non-executable during client render (Next 16 / React 19).
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${outfit.className} min-h-screen min-h-[100dvh] pt-8 bg-white dark:bg-gray-900`}
        suppressHydrationWarning
      >
        <InternalMockBanner />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
