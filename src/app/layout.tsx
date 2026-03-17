import { Outfit } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
import { ThemeScript } from "@/components/ThemeScript";

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <body className={`${outfit.className} min-h-screen bg-white dark:bg-gray-900`} suppressHydrationWarning>
        <ThemeScript />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
