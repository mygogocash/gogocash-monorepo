import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | GoGoCash Admin",
  description: "How to use the GoGoCash admin panel. Guide for new administrators.",
};

export default function SupportPage() {
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Support"
        items={[{ label: "Home", href: "/dashboard" }, { label: "Support" }]}
      />
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
          Admin Panel Guide
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Use this guide to learn how to manage the GoGoCash admin panel. It is intended for new administrators.
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-10">
          {/* Getting started */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              1. Getting started
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              After signing in, you land on the Dashboard. The left sidebar lists all main areas: Users, Offers (including policy and deeplink), Withdraw, Conversion, Banner Management, Coupon Management, and Quest. Use the header to open your profile, account settings, this Support page, or sign out.
            </p>
          </section>

          {/* Dashboard */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              2. Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The Dashboard gives an overview of platform metrics. Use it to monitor key numbers at a glance before diving into specific sections.
            </p>
          </section>

          {/* Users Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              3. Users Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Users Admin</strong> — Manage admin accounts (who can access this panel). Create or edit admin users and their permissions.
              </li>
              <li>
                <strong>Users</strong> — View and manage app users. Search, filter, and open user profiles. You can edit user info, metadata, and address from the user detail view. Use the search or URL parameter to jump to a specific user (e.g. from a conversion or quest view).
              </li>
            </ul>
          </section>

          {/* Offers Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              4. Offers Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Offers</strong> — Manage offers that users can complete for rewards. Create or edit offers, set logos and links, and control visibility. Offer details can be linked to quest tasks and coupons.
              </li>
              <li>
                <strong>Policy Management</strong> — Terms and conditions per category (opens from the Offers section).
              </li>
              <li>
                <strong>Deeplink</strong> — Manage deeplinks that open specific screens or offers in the app (campaigns, notifications, in-app navigation). Listed under Offers Management in the sidebar.
              </li>
            </ul>
          </section>

          {/* Category Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              5. Category Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Category</strong> — Upload or update category images and keep the structure used by the app for browsing offers and content.
              </li>
              <li>
                <strong>Policy Management</strong> — Edit terms and conditions per category.
              </li>
            </ul>
          </section>

          {/* Withdraw Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              6. Withdraw Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review and process user withdrawal requests. Open a request to see details, then approve or reject. Ensure fees and minimums are set correctly under Fee before processing.
            </p>
          </section>

          {/* Conversion Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              7. Conversion Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Conversion</strong> — View conversions (sales or actions linked to offers). Open a row to see “Conversion & user data”; use “View user info” to go to that user on the Users page.
              </li>
              <li>
                <strong>Add conversion</strong> — Manually add a conversion when needed (e.g. offline or reconciled sales).
              </li>
            </ul>
          </section>

          {/* Banner Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              8. Banner Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Home Page Banner</strong> — Manage homepage carousel banners (images and links). Use <strong>Modal popups</strong> to configure up to three app-open popups with redirect links, and <strong>Popup history</strong> to review saved configurations.
            </p>
          </section>

          {/* Coupon Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              9. Coupon Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Coupon</strong> — Create or edit coupon codes. Set the linked offer, validity dates, and discount. Users redeem codes in the app for the linked offer.
              </li>
              <li>
                <strong>Coupon History</strong> — Redemption log with filters, plus a <strong>Views &amp; copies</strong> tab for per-coupon detail views and copy counts (connect your analytics API when ready).
              </li>
            </ul>
          </section>

          {/* Quest Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              10. Quest Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Quest</strong> — View quests and their dates/status. Use “View points” to see participant rankings and export data (supports 1000+ rows). Use “View Quest details” to see full config: links (Facebook Page, Facebook Post, Line) and tasks (offer/merchant, points, completion, condition, link).
              </li>
              <li>
                <strong>Create Quest</strong> — Create a new quest: set start/end dates, upload banners (EN/TH), enable Facebook Page, Facebook Post, and Line and add their URLs. Add tasks by selecting an offer or merchant, points, completion (once or multiple), optional condition (e.g. sale ≥ amount in a currency), and task link. You can upload a custom logo per task. Save the quest when done.
              </li>
              <li>
                <strong>Create Reward</strong> — Create rewards that users can claim (e.g. after completing a quest). Set reward name, amount, currency, and target user.
              </li>
            </ul>
          </section>

          {/* Fee */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              11. Fee
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure system fee (%), withdrawal fees (THB / USD), and minimum withdrawal amounts. These apply when users request withdrawals; review them in Withdraw management.
            </p>
          </section>

          {/* Profile & account */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              12. Profile & account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click your name in the header to open the menu. <strong>Edit profile</strong> and <strong>Account settings</strong> take you to your profile page where you can update your details. Use <strong>Support</strong> (this page) anytime you need a reminder of how the admin panel works. <strong>Sign out</strong> when you are done.
            </p>
          </section>

          {/* Tips */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              Tips for new admins
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Modals (e.g. Coupon, Quest details, User points) often use a fullscreen layout; scroll inside the modal to see all fields, and use the Close/Save buttons in the header.</li>
              <li>When exporting quest user points, the file includes all participants (e.g. 1,500+). Use the “Show” dropdown to limit rows on screen; export always gets the full list.</li>
              <li>Quest tasks can have a condition (e.g. “Sale ≥ 100 THB”). Set the operator, metric (sale/conversion), amount, and currency when creating a task.</li>
              <li>If you need a specific user, go to Users and use the search box, or use “View user info” from a conversion or similar view to jump to that user with search pre-filled.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
