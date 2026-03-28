import { Outfit } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
import InternalMockBanner from "@/components/InternalMockBanner";

const outfit = Outfit({
  subsets: ["latin"],
});

const themeInitScript = `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${outfit.className} min-h-screen pt-8 bg-white dark:bg-gray-900`} suppressHydrationWarning>
        <InternalMockBanner />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
