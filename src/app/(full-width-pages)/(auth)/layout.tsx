import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-auto p-4 sm:p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center lg:min-h-0 lg:h-screen dark:bg-gray-900 sm:p-0">
          {children}
          <div className="fixed bottom-4 right-4 z-50 p-2 sm:bottom-6 sm:right-6 sm:p-0">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
