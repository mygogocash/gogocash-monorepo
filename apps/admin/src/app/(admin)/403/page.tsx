import Link from "next/link";

export const metadata = { title: "Access denied | GoGoCash Admin" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-title-md font-bold text-gray-800 dark:text-white/90">
        403
      </p>
      <h1 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
        Access denied
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        You do not have permission to view this page. If you think this is a
        mistake, ask a Super Admin to adjust your role.
      </p>
      <Link
        href="/dashboard"
        className="bg-brand-500 hover:bg-brand-600 mt-6 inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
