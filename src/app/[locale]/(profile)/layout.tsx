import "@/app/globals.css";
import { Metadata } from "next";
import ProfileLayoutShell from "@/components/layouts/ProfileLayoutShell";
import { METADATA, SITE_ICONS } from "@/constants/Metadata";
import AuthGuard from "@/components/auth/AuthGuard";

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

  return (
    <AuthGuard>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <ProfileLayoutShell>{children}</ProfileLayoutShell>
      </div>
    </AuthGuard>
  );
}
