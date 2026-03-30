import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 min-h-screen overflow-auto bg-white p-4 sm:p-6 dark:bg-gray-900 sm:p-0">
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center lg:h-screen lg:min-h-0 dark:bg-gray-900 sm:p-0">
        {children}
        <div className="fixed right-4 bottom-4 z-50 p-2 sm:right-6 sm:bottom-6 sm:p-0">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
