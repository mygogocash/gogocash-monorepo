import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Support | GoGoCash Admin",
  description: "How to use the GoGoCash admin panel. Guide for new administrators.",
};

export default async function SupportPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
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
          Use this guide to learn how to manage the GoGoCash admin panel. It is intended for new administrators. Menu labels match the left sidebar; some tools also have direct URLs (for example <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">/category</code>).
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-10">
          {/* Getting started */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              1. Getting started
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              After signing in, you usually land on a dashboard. The left sidebar groups tools by area: <strong>Platform Dashboard</strong>, <strong>Users Management</strong>, <strong>Brands Management</strong> (brands list, commission, policy, user tracking link), <strong>Withdraw Management</strong>, <strong>Conversion Management</strong>, <strong>Banner Management</strong>, <strong>Coupon Management</strong>, and <strong>Quest Management</strong>. Below that, <strong>Fee</strong> holds fee and withdrawal settings. Use the header menu for your profile, account settings, this <strong>Support</strong> page, and <strong>Sign out</strong>.
            </p>
          </section>

          {/* Dashboard */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              2. Dashboard
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Platform Dashboard</strong> — Day-to-day operational metrics for the product. Open it from the first item under Menu.
              </li>
            </ul>
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
              <li>
                <strong>MyCashBack Users</strong> — Directory of users enrolled in the MyCashBack program (separate from core GoGoCash users). Search, paginate, and open <strong>View cashback</strong> for balances and buyer details. Linked from Users Management in the sidebar.
              </li>
            </ul>
          </section>

          {/* Brands Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              4. Brands Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Brands</strong> — Manage brands that users can complete for rewards. Create or edit brands, set logos and links, and control visibility. Brand details can be linked to quest tasks and coupons.
              </li>
              <li>
                <strong>Commission Management</strong> — Configure commission rules and rates associated with brands (opens under the Brands area via the Commission tab).
              </li>
              <li>
                <strong>Policy Management</strong> — Terms and conditions per category (opens from the Brands section).
              </li>
              <li>
                <strong>User tracking link</strong> — Manage user-associated tracking links that open specific screens or brands in the app (campaigns, notifications, in-app navigation).
              </li>
            </ul>
          </section>

          {/* Category Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              5. Category
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Open <strong>/category</strong> to upload or update category images and maintain the structure the app uses when browsing brands and content. Policy text per category is edited from <strong>Policy Management</strong> under Brands, not on this page.
            </p>
          </section>

          {/* Withdraw Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              6. Withdraw Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                Review withdrawal requests in the list; open a row for full detail, bank accounts, and history.
              </li>
              <li>
                Approve or reject from the detail flow as your process requires. Confirm <strong>Fee</strong> settings (rates and minimums) before processing payouts.
              </li>
              <li>
                On the user detail tab you can <strong>Edit user</strong> to change profile fields and multiple email addresses or phone numbers.
              </li>
              <li>
                <strong>OTP for new contacts:</strong> Any email or phone that was not already on the user when you opened the editor must be verified. Click <strong>Send OTP</strong>, enter the code you receive (in demo/mock environments the UI may show a fixed test code), then <strong>Verify</strong>. <strong>Save changes</strong> stays disabled until every new address or number is verified. Existing contacts on file do not need OTP again unless you change them to a different value.
              </li>
              <li>
                From some user-related screens you can jump straight into edit mode on the withdraw user view using the URL flag <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">?editUser=1</code> on the withdraw detail page.
              </li>
            </ul>
          </section>

          {/* Conversion Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              7. Conversion Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Conversion</strong> — View conversions (sales or actions linked to brands). Open a row to see “Conversion & user data”; use “View user info” to go to that user on the Users page.
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
              <strong>Home Page Banner</strong> — Main homepage carousel plus a separate <strong>Home Page Banner Small Banner</strong> strip (same page). <strong>All Brand Page banner</strong> covers the in-app all-brands listing screen. Use <strong>Modal popups</strong> to configure up to three app-open popups with redirect links, and <strong>Popup history</strong> to review saved configurations.
            </p>
          </section>

          {/* Coupon Management */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
              9. Coupon Management
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>Coupon</strong> — Create or edit coupon codes. Set the linked brand, validity dates, and discount. Users redeem codes in the app for the linked brand.
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
                <strong>Quest</strong> — View quests and their dates/status. Create new quests from this area when available. Use “View points” to see participant rankings and export data (supports 1000+ rows). Use “View Quest details” to see full config: links (Facebook Page, Facebook Post, Line) and tasks (brand/merchant, points, completion, condition, link).
              </li>
              <li>
                When creating a quest: set start/end dates, upload banners (EN/TH), enable Facebook Page, Facebook Post, and Line and add their URLs. Add tasks by selecting a brand or merchant, points, completion (once or multiple), optional condition (e.g. sale ≥ amount in a currency), and task link. You can upload a custom logo per task, then save.
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
              Under the sidebar <strong>Fee</strong> section, open <strong>Fee Structure</strong> to configure system fee (%), withdrawal fees (THB / USD), and minimum withdrawal amounts. These apply when users request withdrawals; keep them aligned with how you process requests in Withdraw management.
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
              <li>Editing a withdraw user’s emails or phones requires OTP verification for each new or changed value before Save is enabled—plan a moment to complete Send OTP → Verify when updating contacts.</li>
              <li>Commission and policy for brands live under Brands Management (tabs), not on the Category page.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
