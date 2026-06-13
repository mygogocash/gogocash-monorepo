import { expect, test } from "@playwright/test";

import { attachPageErrorCollector } from "../../../e2e/attachPageErrorCollector";

const mobileSessionStorageKey = "gogocash.mobile.session.v1";

const designQaSession = {
  _id: "mock-user-001",
  access_token: "design-qa-session",
  email: "mock.user@gogocash.co",
  provider: "design_qa",
  username: "Mock User",
};

const p0Routes = [
  {
    path: "/",
    requiredLabel: ["Search brands, stores, products, and cashback offers"],
    requiredText: [
      "All Brands",
      "All Shops",
      "Product Discovery",
      "Top Brands",
      "Trending Brands",
      "Travel Deals are Here!",
      "Makeup Must Have!",
    ],
  },
  {
    path: "/profile",
    requiredText: [
      "Profile",
      "Total Cashback Available",
      "Personal Information",
      "My Rating Score",
      "Withdraw Methods",
      "Account Setting",
      "Terms of Use",
      "Terms of Service",
      "Log Out",
    ],
  },
  {
    path: "/credit-score",
    requiredText: [
      "My Rating Score",
      "Your GoGoPass Score",
      "40",
      "Starter",
      "40 more points to Trusted",
      "40 / 80 pts",
      "Earn more points",
      "Email verified",
      "Phone verified",
      "Monthly spend ≥ ฿3,000",
      "What you get",
      "Free GoGoPass — 12 Months",
    ],
  },
  {
    path: "/method",
    requiredText: [
      "Withdraw Method",
      "My withdrawal methods",
      "Add Methods",
      "[Default]",
      "Demo Shopper",
      "Kasikorn Bank",
      "****7890",
      "Bangkok Bank",
      "****3210",
    ],
  },
  {
    path: "/language",
    requiredText: [
      "Account Settings",
      "Your Subscription",
      "View and manage your GoGoCash subscription billing on Stripe.",
      "Open Stripe Subscription",
      "Subscription billing is not enabled yet.",
      "Receive Notifications about Updates",
      "Notifications via Line",
      "Notifications via Email",
      "Coming soon",
      "Join our Community",
      "Facebook",
      "Instagram",
      "Line",
      "YouTube",
    ],
  },
  {
    path: "/privacy-center",
    requiredText: [
      "Privacy center",
      "Consent preferences",
      "We collect this information for the stated purpose under PDPA.",
      "Get the full GoGoCash experience",
      "Accept all optional consents",
      "Optional data uses",
      "Marketing communications",
      "Analytics",
      "B2B aggregated insights",
      "AI credit scoring",
      "Cashback tracking (required for service)",
      "Always on",
    ],
  },
  {
    path: "/privacy-policy",
    requiredText: [
      "Privacy Policy",
      "Effective Date: 1 April 2026",
      "Last Updated: 1 April 2026",
      "GOGO HOLDING (THAILAND) Company Limited",
      "This Privacy Policy is intended to help you understand:",
      "1. Who We Are",
    ],
  },
  {
    path: "/referral",
    requiredText: [
      "Referral",
      "Refer & Earn",
      "For each friend that you invite",
      "Share your referral link",
      "invite link",
      "Share referral link on social media",
      "Invitation",
      "All Invitations",
      "Created Account",
      "Shopped with Us",
      "Date",
      "User",
      "Point",
      "FriendInvite",
      "120 pts",
    ],
  },
  {
    path: "/link-mycashback",
    requiredText: [
      "Sign in",
      "Manage your activities in one centralized account",
      "Link MyCashback with GoGoCash",
      "Skip",
      "Link Account",
    ],
  },
  {
    path: "/link-mycashback/my-cashback-sign-in",
    requiredText: [
      "Select Your Preferred Link",
      "Connected account",
      "mycashback.user@example.com",
      "Link Selected Account",
    ],
  },
  {
    path: "/favorite",
    requiredText: [
      "Favorite Brands",
      "Find Your Brands",
      "Find your favorite brands, explore new ones, and enjoy cashback on every purchase.",
      "See More",
      "Recently Visited Brands",
      "Your Favorite Brands",
      "Grab Coupon",
      "Cashback up to",
    ],
  },
  {
    path: "/missing-orders",
    requiredText: [
      "Missing Orders",
      "Self-service form: add your purchase details",
      "Get help on LINE",
      "Your purchase",
      "Store or marketplace",
      "Order ID",
      "Purchase Amount in THB",
      "Your GoGoCash account",
      "User ID",
      "Extra context",
      "Screenshots or receipts",
      "Submit claim",
      "How to get",
      "Cashback",
      "Team Support",
      "Need help with cashback? We're here to assist you.",
    ],
  },
  {
    path: "/wallet",
    requiredText: [
      "My Wallet",
      "Report if your cashback wasn't tracked",
      "Contact Support",
      "Cashback Summary",
      "Total Cashback",
      "Pending Cashback",
    ],
  },
  {
    path: "/quest",
    requiredText: ["How to win!", "Tasks", "Leaderboard"],
  },
  {
    path: "/golink",
    requiredPlaceholder: ["Paste your product or shop link here"],
    requiredText: ["GoGoLink", "Paste and Go", "How it works"],
  },
  {
    path: "/discover",
    requiredDesktopText: ["All Categories"],
    requiredText: [
      "Product Discovery",
      "Grocery Galaxy",
      "Price",
      "1,522 THB",
      "Shop Now",
      "Learn more about T&C",
    ],
  },
  {
    path: "/category",
    requiredPlaceholder: ["Find a category"],
    requiredText: [
      "Categories",
      "5 categories available",
      "Travel",
      "Electronics",
      "Beauty",
      "Health & Beauty",
      "Others",
      "Browse this collection",
    ],
  },
  {
    path: "/category/Health%20%26%20Beauty",
    requiredPlaceholder: ["Search within Health & Beauty"],
    requiredText: [
      "Explore your Favorite Health & Beauty",
      "Find cashback deals from stores in Health & Beauty. Search and sort to narrow results.",
      "Categories",
      "All",
      "Digital Services",
      "High Cashback",
      "Lowest Cashback",
      "13 stores in this category",
      "Pure Ritual",
      "Pearl Polish",
      "Cashback up to",
    ],
  },
  {
    path: "/shop/brand-grocery-galaxy-1001",
    requiredText: [
      "Grocery Galaxy",
      "Shop Now",
      "Cashback up to",
      "26.5%",
      "Extra Cashback 14%",
      "Cashback starting from",
      "Groceries",
      "Lifestyle",
      "Cashback Tracking Period",
      "Target Top Coupons and Deals",
      "No deals available right now",
    ],
  },
  {
    path: "/gogosense",
    requiredText: [
      "GoGoSense",
      "Cashback tracking assistant",
      "Permission checklist",
      "Tracking timeline",
      "Start setup",
    ],
  },
  {
    path: "/gogosense/onboarding",
    requiredText: [
      "Set up GoGoSense",
      "Install native detector",
      "Connect browser and app signals",
      "Continue to permissions",
    ],
  },
  {
    path: "/gogosense/permissions",
    requiredText: [
      "Permission checklist",
      "Usage access",
      "Notification listener",
      "Open settings",
      "View timeline",
    ],
  },
  {
    path: "/gogosense/timeline",
    requiredText: [
      "Tracking timeline",
      "Detected shopping session",
      "Cashback pending",
      "Start recovery",
    ],
  },
  {
    path: "/gogosense/settings",
    requiredText: [
      "Tracking controls",
      "PII minimization",
      "Usage access detection",
      "Permission checklist",
    ],
  },
  {
    path: "/gogosense/recovery",
    requiredText: [
      "Screenshot recovery",
      "Manual merchant review",
      "Back to timeline",
    ],
  },
  {
    path: "/gogosense/merchant/grocery-galaxy",
    requiredText: [
      "Merchant tracking detail",
      "grocery-galaxy",
      "Detection methods",
      "Start recovery",
    ],
  },
] as const;

const placeholderText = [
  "Screen contract",
  "Related web screens",
  "Matches the GoGoCash web mobile shell",
  "Route parameter",
  "Cashback deals made for GoGoCash members",
  "Browse stores, claim rewards",
  "Create cashback links anywhere",
  "Fast tracking",
  "Secure wallet",
];

const sdk55FrameworkWarnings = [
  "props.pointerEvents is deprecated. Use style.pointerEvents",
  'shadow*" style props are deprecated. Use "boxShadow"',
  "Image: style.resizeMode is deprecated. Please use props.resizeMode.",
  "Animated: `useNativeDriver` is not supported because the native animated module is missing.",
] as const;

async function seedDesignQaSession(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    { key: mobileSessionStorageKey, session: designQaSession }
  );
}

function actionableMessages(messages: string[]): string[] {
  return messages.filter(
    (message) => !sdk55FrameworkWarnings.some((allowedWarning) => message.includes(allowedWarning))
  );
}

async function maxVisibleContentWidth(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const isInsideHorizontalScroller = (element: Element): boolean => {
      let parent = element.parentElement;
      while (parent) {
        if (parent.scrollWidth > parent.clientWidth + 1) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    const widths = Array.from(document.querySelectorAll("a, button, [role='button'], div")).map(
      (element) => {
        const box = element.getBoundingClientRect();
        const text = element.textContent || "";
        if (!text.trim()) return 0;
        if (Math.round(box.width) >= window.innerWidth) return 0;
        if (isInsideHorizontalScroller(element)) return 0;
        return Math.round(box.width);
      }
    );
    return Math.max(...widths);
  });
}

test.describe("mobile design QA parity", () => {
  test.beforeEach(async ({ page }) => {
    await seedDesignQaSession(page);
  });

  for (const route of p0Routes) {
    test(`${route.path} > given P0 mobile design QA > then shell and content match web parity contract`, async ({
      page,
    }) => {
      const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });
      const viewportWidth = page.viewportSize()?.width ?? 0;

      const response = await page.goto(route.path, { waitUntil: "networkidle" });

      expect(response?.ok()).toBeTruthy();
      for (const testId of "requiredTestId" in route ? route.requiredTestId : []) {
        await expect(page.getByTestId(testId).first()).toBeVisible();
      }
      for (const label of "requiredLabel" in route ? route.requiredLabel : []) {
        if (
          route.path === "/" &&
          viewportWidth >= 1024 &&
          label === "Search brands, stores, products, and cashback offers"
        ) {
          continue;
        }
        await expect(page.getByLabel(label, { exact: false }).first()).toBeVisible();
      }
      for (const placeholder of "requiredPlaceholder" in route ? route.requiredPlaceholder : []) {
        await expect(page.getByPlaceholder(placeholder, { exact: false }).first()).toBeVisible();
      }
      for (const text of route.requiredText) {
        await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      }
      for (const text of "requiredDesktopText" in route ? route.requiredDesktopText : []) {
        if (viewportWidth >= 1024) {
          await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
        }
      }
      for (const text of "requiredMobileText" in route ? route.requiredMobileText : []) {
        if (viewportWidth < 1024) {
          await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
        }
      }
      for (const text of placeholderText) {
        await expect(page.getByText(text, { exact: false })).toHaveCount(0);
      }

      const maxExpectedContentWidth = test.info().project.name.includes("wide") ? 1440 : 448;
      expect(await maxVisibleContentWidth(page)).toBeLessThanOrEqual(maxExpectedContentWidth);
      const actionable = actionableMessages(messages);
      expect(actionable, actionable.join("\n")).toEqual([]);
    });
  }

  test("/ > given desktop Next shell parity > then header, category nav, GoGoLink, footer, and cookie banner render and dismiss", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });
    const viewportWidth = page.viewportSize()?.width ?? 0;

    test.skip(viewportWidth < 1024, "Desktop shell parity applies at desktop widths.");

    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("pdpa_consent_banner_dismissed_v1"));
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.getByText("GoGoCash", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Quest", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sign in", { exact: true })).toBeVisible();
    const headerEdgeBackground = await page.evaluate(() => {
      const edgeElement = document.elementFromPoint(8, 40);
      return edgeElement ? getComputedStyle(edgeElement).backgroundColor : null;
    });
    expect(headerEdgeBackground).toBe("rgb(255, 255, 255)");
    const logoBox = await page.getByLabel("GoGoCash logo").boundingBox();
    const topBrandsBox = await page
      .getByLabel("Category navigation")
      .getByText("Top Brands", { exact: true })
      .boundingBox();
    expect(logoBox?.x).toBeCloseTo(384, 0);
    expect(logoBox?.y).toBeCloseTo(12, 0);
    expect(topBrandsBox?.x).toBeCloseTo(507.5, 0);
    expect(topBrandsBox?.y).toBeCloseTo(97.5, 1);
    await expect(page.getByLabel("LINE Official Account")).toBeVisible();
    await expect(page.getByRole("link", { name: "LINE Official Account" })).toHaveAttribute(
      "href",
      "https://lin.ee/7om5sAr"
    );
    for (const navLabel of [
      "Top Brands",
      "All Brands",
      "All Shops",
      "Product Discovery",
      "Travel",
      "Electronics",
      "Health & Beauty",
    ]) {
      await expect(page.getByText(navLabel, { exact: true }).first()).toBeVisible();
    }
    await expect(
      page.getByText("We use cookies in the delivery of our services.", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Accept all cookies" }).click();
    await expect(
      page.getByText("We use cookies in the delivery of our services.", { exact: true })
    ).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByText("We use cookies in the delivery of our services.", { exact: true })
    ).toHaveCount(0);

    const desktopGoLinkBanner = page.getByTestId("desktop-golink-banner");
    await expect(desktopGoLinkBanner).toBeVisible();
    await expect(
      page.getByText("GoGoLink – Easy to earn cashback by just copy, paste and shop!", {
        exact: true,
      })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Paste your product or shop link here")).toBeVisible();
    await expect(page.getByRole("button", { name: "Paste and Go" })).toBeVisible();

    await page.getByRole("button", { name: "About GoLink" }).click();
    await expect(
      page.getByText("Easy to earn cashback by GoGoLink", { exact: true })
    ).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Close GoLink guide" }).click();
    await expect(page.getByText("Easy to earn cashback by GoGoLink", { exact: true })).toHaveCount(
      0
    );

    await page.getByLabel("Product or shop link").fill("not a url");
    await page.getByRole("button", { name: "Paste and Go" }).click();
    await expect(page.getByText("Please paste a valid product or shop link.")).toBeVisible();
    await page.getByLabel("Product or shop link").fill("www.lazada.co.th/products/demo");
    await page.getByRole("button", { name: "Paste and Go" }).click();
    await expect(page.getByText("Link pasted successfully!")).toBeVisible();
    await expect(page.getByText("Link from lazada.co.th")).toBeVisible();

    const desktopFooter = page.getByTestId("desktop-footer");
    await desktopFooter.scrollIntoViewIfNeeded();
    await expect(desktopFooter).toBeVisible();
    await expect(desktopFooter.getByText("GoGoCash", { exact: true }).first()).toBeVisible();
    for (const footerText of [
      "Live on Platform",
      "Website",
      "Telegram Mini App",
      "Line Mini App",
      "Products",
      "Business Inquiries",
      "Careers",
      "Secured by",
      "Resources",
      "Privacy Policy",
      "Terms of Use",
      "Terms of Service",
      "How GoGoCash Makes Money",
      "Learn",
      "System Status",
      "Cookie Settings",
    ]) {
      await expect(desktopFooter.getByText(footerText, { exact: true })).toBeVisible();
    }
    await expect(desktopFooter.getByRole("link", { name: "Cloudflare" })).toHaveAttribute(
      "href",
      "https://www.cloudflare.com"
    );
    for (const socialLabel of [
      "X",
      "Discord",
      "Telegram",
      "Line",
      "Threads",
      "LinkedIn",
      "GitHub",
      "YouTube",
    ]) {
      await expect(
        desktopFooter.getByRole("link", { exact: true, name: socialLabel })
      ).toBeVisible();
    }
    await expect(
      desktopFooter.getByText("© 2026 Copyright - Made with 💚 by GoGoCash")
    ).toBeVisible();
    await expect(
      desktopFooter.getByText(
        "Cashback rates, merchant availability, and product features may change.",
        { exact: false }
      )
    ).toBeVisible();

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/login > given desktop Next auth reference > then header hero phone form social grid and OTP flow render cleanly", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });
    const viewportWidth = page.viewportSize()?.width ?? 0;

    test.skip(viewportWidth < 1024, "Desktop auth parity applies at desktop widths.");

    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page.getByText("GoGoCash", { exact: true }).first()).toBeVisible();
    for (const navLabel of ["Top Brands", "All Brands", "Product Discovery"]) {
      await expect(page.getByText(navLabel, { exact: true }).first()).toBeVisible();
    }

    const authCard = page.getByTestId("auth-card");
    await expect(authCard).toBeVisible();
    await expect(authCard.getByText("Sign in", { exact: true }).first()).toBeVisible();
    await expect(authCard.getByText("Get started earning cashback", { exact: true })).toBeVisible();
    await expect(authCard.getByText("Select Country", { exact: true })).toBeVisible();
    await expect(authCard.getByText("Thailand", { exact: true })).toBeVisible();
    await expect(authCard.getByText("Sign in with Phone Number", { exact: true })).toBeVisible();
    await expect(authCard.getByText("+66", { exact: true })).toBeVisible();
    await expect(authCard.getByPlaceholder("Phone Number")).toBeVisible();
    await expect(authCard.getByText("I have read and understand", { exact: true })).toBeVisible();
    await expect(authCard.getByText("Privacy Policy", { exact: true })).toBeVisible();
    await expect(authCard.getByText("or sign in with", { exact: true })).toBeVisible();
    for (const providerLabel of [
      "Facebook",
      "Gmail",
      "Telegram",
      "Apple",
      "X",
      "Microsoft",
      "Connect Wallet",
    ]) {
      await expect(
        authCard.getByRole("button", { exact: true, name: providerLabel })
      ).toBeVisible();
    }
    await expect(page.getByPlaceholder("Email")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);

    const signInCta = authCard.getByRole("button", { exact: true, name: "Sign in" });
    await expect(signInCta).toBeDisabled();
    await authCard.getByPlaceholder("Phone Number").fill("1234567890");
    await authCard.getByRole("checkbox", { name: "I have read and understand" }).click();
    await expect(signInCta).toBeEnabled();
    await signInCta.click();

    await expect(
      authCard.getByText(
        "A verification code will be sent to your mobile number to confirm this action is being performed by you.",
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      authCard.getByText("Code is sent to phone number :", { exact: true })
    ).toBeVisible();
    await expect(authCard.getByText("+66 ******7890", { exact: true })).toBeVisible();
    await expect(authCard.getByRole("button", { name: "Change phone number" })).toBeVisible();
    await expect(authCard.getByLabel("Verification code")).toBeVisible();
    await expect(authCard.getByRole("button", { name: "Resend ?" })).toBeVisible();
    await expect(authCard.getByRole("button", { name: "Next" })).toBeVisible();

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/register > given desktop Next auth reference > then register copy uses the same phone auth layout", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });
    const viewportWidth = page.viewportSize()?.width ?? 0;

    test.skip(viewportWidth < 1024, "Desktop auth parity applies at desktop widths.");

    await page.goto("/register", { waitUntil: "networkidle" });

    await expect(page.getByText("GoGoCash", { exact: true }).first()).toBeVisible();
    const authCard = page.getByTestId("auth-card");
    await expect(authCard).toBeVisible();
    await expect(authCard.getByText("Sign up", { exact: true }).first()).toBeVisible();
    await expect(authCard.getByText("Get started earning cashback", { exact: true })).toBeVisible();
    await expect(authCard.getByText("Sign up with Phone Number", { exact: true })).toBeVisible();
    await expect(authCard.getByText("or sign up with", { exact: true })).toBeVisible();
    await expect(authCard.getByPlaceholder("Phone Number")).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toHaveCount(0);
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);

    const signUpCta = authCard.getByRole("button", { exact: true, name: "Sign up" });
    await expect(signUpCta).toBeDisabled();
    await authCard.getByPlaceholder("Phone Number").fill("1234567890");
    await authCard.getByRole("checkbox", { name: "I have read and understand" }).click();
    await expect(signUpCta).toBeEnabled();

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/profile > given web legal and support rows > then native exposes matching external links", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/profile", { waitUntil: "networkidle" });

    await expect(page.getByRole("link", { name: /Terms of Use/ })).toHaveAttribute(
      "href",
      "https://gogocash.co/term-of-use"
    );
    await expect(page.getByRole("link", { name: /Terms of Service/ })).toHaveAttribute(
      "href",
      "https://gogocash.co/terms-of-service"
    );
    await expect(page.getByRole("link", { name: /Help Center/ })).toHaveAttribute(
      "href",
      "https://lin.ee/7om5sAr"
    );
    await expect(page.getByRole("link", { name: /Connect with GoGoCash/ })).toHaveAttribute(
      "href",
      "https://linktr.ee/gogocash"
    );
    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/profile > given Profile submenu trigger > then clicking toggles the submenu without hiding sibling rows", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/profile", { waitUntil: "networkidle" });
    const profileTrigger = page.getByRole("button", { name: "Profile" });

    await expect(profileTrigger).toBeVisible();
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Personal Information", { exact: true })).toBeVisible();
    await expect(page.getByText("My Rating Score", { exact: true })).toBeVisible();
    await expect(page.getByText("Invited : 2", { exact: true })).toBeVisible();

    await profileTrigger.click();
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Personal Information", { exact: true })).toHaveCount(0);
    await expect(page.getByText("My Rating Score", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Invited : 2", { exact: true })).toBeVisible();

    await profileTrigger.click();
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Personal Information", { exact: true })).toBeVisible();

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/referral > given production share actions > then copy and social buttons match web behavior", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/referral", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (value: string) => {
            ((window as unknown as { __copiedReferralLinks?: string[] }).__copiedReferralLinks ??=
              []).push(value);
            return Promise.resolve();
          },
        },
      });
      (window as unknown as { __openedReferralShares?: string[] }).__openedReferralShares = [];
      window.open = (url?: string | URL) => {
        if (url) {
          (window as unknown as { __openedReferralShares: string[] }).__openedReferralShares.push(
            String(url)
          );
        }
        return null;
      };
    });

    await page.getByRole("button", { name: "Copy referral link" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __copiedReferralLinks?: string[] }).__copiedReferralLinks
        )
      )
      .toContainEqual("https://gogocash.co/ref/mock-user-001");

    await page.getByRole("button", { name: "Facebook" }).click();
    await page.getByRole("button", { name: "LinkedIn" }).click();
    await page.getByRole("button", { exact: true, name: "X" }).click();
    await page.getByRole("button", { name: "Instagram" }).click();

    const openedShares = await page.evaluate(
      () => (window as unknown as { __openedReferralShares?: string[] }).__openedReferralShares
    );
    expect(openedShares).toEqual([
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fgogocash.co%2Fref%2Fmock-user-001",
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgogocash.co%2Fref%2Fmock-user-001",
      "https://twitter.com/intent/tweet?url=https%3A%2F%2Fgogocash.co%2Fref%2Fmock-user-001",
    ]);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __copiedReferralLinks?: string[] }).__copiedReferralLinks
        )
      )
      .toContainEqual("https://gogocash.co/ref/mock-user-001");

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/referral > given clipboard write is rejected > then copy action keeps the page usable", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/referral", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error("clipboard denied")),
        },
      });
    });

    await page.getByRole("button", { name: "Copy referral link" }).click();
    await expect(page.getByText("Refer & Earn")).toBeVisible();
    await expect(page.getByText("Uncaught Error")).toHaveCount(0);

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/referral > given lower web parity sections render > then step banner keeps reference aspect ratio", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/referral", { waitUntil: "networkidle" });

    const stepBannerMetrics = await page.evaluate(() => {
      const stepBanner = Array.from(document.querySelectorAll("img")).find((image) =>
        image.getAttribute("src")?.includes("referral-step-banner")
      );
      if (!stepBanner) {
        return null;
      }
      const rect = stepBanner.getBoundingClientRect();
      return {
        height: rect.height,
        ratio: rect.width / rect.height,
        width: rect.width,
      };
    });

    expect(stepBannerMetrics).not.toBeNull();
    expect(stepBannerMetrics?.ratio).toBeGreaterThan(1.9);
    expect(stepBannerMetrics?.ratio).toBeLessThan(2.02);
    await expect(page.getByText("Refer Friends FAQs")).toBeVisible();

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/privacy-policy > given legal article renders > then mobile and desktop keep readable legal layout without overflow", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/privacy-policy", { waitUntil: "networkidle" });
    await expect(page.getByText("Effective Date: 1 April 2026")).toBeVisible();
    await expect(page.getByText("1. Who We Are")).toBeVisible();

    const legalMetrics = await page.evaluate(() => {
      const articleBlock = document.querySelector('[data-testid="privacy-policy-article"]');
      const titleBlock = Array.from(document.querySelectorAll("div, h1")).find(
        (element) => element.textContent?.trim() === "Privacy Policy"
      );
      const articleRect = articleBlock?.getBoundingClientRect();
      const titleRect = titleBlock?.getBoundingClientRect();
      return {
        articleWidth: articleRect?.width ?? 0,
        documentWidth: document.documentElement.scrollWidth,
        titleFontSize: titleBlock
          ? Number.parseFloat(window.getComputedStyle(titleBlock).fontSize)
          : 0,
        titleY: titleRect?.top ?? -1,
        viewportWidth: window.innerWidth,
      };
    });
    const whoWeAreBox = await page.getByText("1. Who We Are").boundingBox();

    expect(legalMetrics.documentWidth).toBeLessThanOrEqual(legalMetrics.viewportWidth + 1);
    expect(legalMetrics.articleWidth).toBeGreaterThan(280);
    expect(legalMetrics.articleWidth).toBeLessThanOrEqual(800);
    expect(legalMetrics.titleFontSize).toBeGreaterThanOrEqual(24);
    expect(legalMetrics.titleFontSize).toBeLessThanOrEqual(32);
    expect(legalMetrics.titleY).toBeGreaterThanOrEqual(24);
    expect(whoWeAreBox?.y).toBeLessThan(840);

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/golink > given pasted URL without scheme > then Paste and Go opens the link preview", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/golink", { waitUntil: "networkidle" });

    await page.getByLabel("Product or shop link").fill("www.lazada.co.th/products/demo");
    await page.getByRole("button", { name: "Paste and Go" }).click();

    await expect(page.getByText("Link pasted successfully!")).toBeVisible();
    await expect(page.getByText("Link from lazada.co.th")).toBeVisible();
    await expect(page.getByText("Please paste a valid product or shop link.")).toHaveCount(0);

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/ > given bottom nav GoGoLink tap > then web-style modal opens without leaving home", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });
    const viewportWidth = page.viewportSize()?.width ?? 0;

    if (viewportWidth < 768) {
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByText("Top Brands", { exact: false }).first()).toBeVisible();
      const acceptCookies = page.getByRole("button", { name: "Accept all cookies" });
      if ((await acceptCookies.count()) > 0) {
        await acceptCookies.click();
        await expect(
          page.getByText("We use cookies in the delivery of our services.", { exact: true })
        ).toHaveCount(0);
      }

      const goLinkLabels = page.getByText("GoGoLink", { exact: true });
      const goLinkLabelCount = await goLinkLabels.count();
      expect(goLinkLabelCount).toBeGreaterThan(0);
      await goLinkLabels.nth(goLinkLabelCount - 1).click();

      expect(new URL(page.url()).pathname).toBe("/");
    } else {
      await page.goto("/golink", { waitUntil: "networkidle" });
    }

    await expect(
      page.getByText("GoGoLink – Easy to earn cashback", { exact: false })
    ).toBeVisible();
    await expect(page.getByLabel("Product or shop link")).toBeVisible();
    const pasteButton = page.getByRole("button", { name: "Paste and Go" });
    await expect(pasteButton).toBeVisible();

    if (viewportWidth < 768) {
      await expect(page.getByText("Top Brands", { exact: false }).first()).toBeVisible();
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const expectedButtonY = viewportHeight - 464 + 376;
      await expect
        .poll(async () => (await pasteButton.boundingBox())?.y ?? 0)
        .toBeLessThanOrEqual(expectedButtonY + 12);
      const buttonBox = await pasteButton.boundingBox();
      expect(buttonBox?.x).toBeGreaterThanOrEqual(26);
      expect(buttonBox?.x).toBeLessThanOrEqual(31);
      expect(buttonBox?.y).toBeGreaterThanOrEqual(expectedButtonY - 12);
      expect(buttonBox?.y).toBeLessThanOrEqual(expectedButtonY + 12);
      expect(buttonBox?.width).toBeGreaterThanOrEqual(330);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(46);
      expect(buttonBox?.height).toBeLessThanOrEqual(50);
    }

    await page.getByLabel("Product or shop link").fill("www.lazada.co.th/products/demo");
    await pasteButton.click();
    await expect(page.getByText("Link pasted successfully!")).toBeVisible();
    await expect(page.getByText("Link from lazada.co.th")).toBeVisible();

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/ > given selected home block > then shortcuts, banners, and Top Brands link like web", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("Top Brands", { exact: false }).first()).toBeVisible();

    const metrics = await page.evaluate(() => {
      const normalizedHref = (anchor: HTMLAnchorElement) =>
        new URL(anchor.href, window.location.href).pathname;
      const visibleAnchorBoxes = Array.from(document.querySelectorAll<HTMLAnchorElement>("a")).map(
        (anchor) => {
          const rect = anchor.getBoundingClientRect();
          return {
            height: Math.round(rect.height),
            href: normalizedHref(anchor),
            text: (anchor.textContent || "").replace(/\s+/g, " ").trim(),
            width: Math.round(rect.width),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
          };
        }
      );
      const findLink = (matcher: (link: (typeof visibleAnchorBoxes)[number]) => boolean) =>
        visibleAnchorBoxes.find((link) => link.width > 0 && link.height > 0 && matcher(link));

      return {
        categoryShortcut: findLink(
          (link) => link.href === "/category" && link.text === "Categories"
        ),
        firstHero: findLink(
          (link) =>
            link.href === "/shop/brand-grocery-galaxy-1001" && link.y < 260 && link.width > 300
        ),
        firstTopBrand: findLink(
          (link) =>
            link.href === "/shop/brand-grocery-galaxy-1001" &&
            link.y > 560 &&
            link.text.includes("Grocery Galaxy")
        ),
        sideHero: findLink((link) => link.href === "/shop/brand-pixelport-1004"),
        viewportWidth: window.innerWidth,
      };
    });

    expect(metrics.firstHero).toMatchObject({
      href: "/shop/brand-grocery-galaxy-1001",
    });
    expect(metrics.sideHero).toMatchObject({
      href: "/shop/brand-pixelport-1004",
    });
    expect(metrics.firstTopBrand).toMatchObject({
      href: "/shop/brand-grocery-galaxy-1001",
    });

    if (metrics.viewportWidth < 768) {
      expect(metrics.categoryShortcut?.x).toBeLessThanOrEqual(430);
      expect(metrics.sideHero?.height).toBeGreaterThanOrEqual(150);
      expect(metrics.sideHero?.height).toBeLessThanOrEqual(166);
    }

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/category/Health & Beauty > given search and sort controls > then results filter and reorder like web", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/category/Health%20%26%20Beauty", { waitUntil: "networkidle" });

    await page.getByPlaceholder("Search within Health & Beauty").fill("pearl");
    await expect(page.getByTestId("category-result-card-0")).toContainText("Pearl Polish");
    await expect(page.getByText("Pure Ritual", { exact: true })).toHaveCount(0);

    await page.getByPlaceholder("Search within Health & Beauty").fill("");
    await page.getByRole("button", { name: "Lowest Cashback" }).click();
    await expect(page.getByTestId("category-result-card-0")).toContainText("Harbor Herbs");

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });

  test("/category > given category search and card navigation > then matching category cards filter and link like web", async ({
    page,
  }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto("/category", { waitUntil: "networkidle" });

    await page.getByPlaceholder("Find a category").fill("beauty");
    await expect(page.getByTestId("category-directory-card-0")).toContainText("Beauty");
    await expect(page.getByTestId("category-directory-card-1")).toContainText("Health & Beauty");
    await expect(page.getByText("Travel", { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: /Health & Beauty/ }).click();
    await expect(page).toHaveURL(/\/category\/Health%20&%20Beauty/);

    const actionable = actionableMessages(messages);
    expect(actionable, actionable.join("\n")).toEqual([]);
  });
});
