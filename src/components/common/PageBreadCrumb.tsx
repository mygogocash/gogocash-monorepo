import Link from "next/link";
import React from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  pageTitle: string;
  /** When set, breadcrumb trail uses these items (with routing). Last item is current page (no link). */
  items?: BreadcrumbItem[];
}

const Chevron = () => (
  <svg
    className="stroke-current shrink-0 text-gray-400"
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, items }) => {
  const trail = items && items.length > 0
    ? items
    : [
        { label: "Home", href: "/" as string },
        { label: pageTitle },
      ];

  return (
    <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
      <h2
        className="min-w-0 truncate text-xl font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        {pageTitle}
      </h2>
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex flex-wrap items-center gap-1.5">
          {trail.map((item, i) => {
            const isLast = i === trail.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <Chevron />}
                {item.href && !isLast ? (
                  <Link
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-800 dark:text-white/90">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
