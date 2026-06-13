"use client";

import "@/lib/installFirebaseStaticShims";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeColorMeta from "@/components/theme/ThemeColorMeta";
import DateInputCalendarAutoOpen from "@/components/datepicker/DateInputCalendarAutoOpen";
import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/queryClient";
// Create a client
import { Toaster } from "react-hot-toast";
const queryClient = getQueryClient();
export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
        <ThemeProvider>
          <ThemeColorMeta />
          <DateInputCalendarAutoOpen />
          <Toaster
            position="top-right"
            containerStyle={{
              top: "max(1rem, env(safe-area-inset-top, 0px))",
              right: "max(1rem, env(safe-area-inset-right, 0px))",
            }}
            toastOptions={{
              className:
                "!bg-white !text-gray-900 !border !border-gray-200 dark:!bg-gray-800 dark:!text-gray-100 dark:!border-gray-700",
            }}
          />
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
