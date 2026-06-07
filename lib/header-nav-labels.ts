/**
 * Main nav copy for `<Header />`, keyed by URL locale prefix (`/th`, `/tw`, …).
 * Learn hub stays at `/learn` (English); only visible labels are localized.
 */

export type HeaderNavLabels = {
  home: string;
  brands: string;
  howItWorks: string;
  faq: string;
  learn: string;
  quest: string;
  startEarning: string;
  mainNavAria: string;
  toggleMenuAria: string;
};

const LABELS: Record<"en" | "th" | "tw" | "cn" | "ja" | "id", HeaderNavLabels> = {
  en: {
    home: "Home",
    brands: "Brands",
    howItWorks: "How it works",
    faq: "FAQ",
    learn: "Learn",
    quest: "Quest",
    startEarning: "Start earning",
    mainNavAria: "Main navigation",
    toggleMenuAria: "Toggle menu",
  },
  th: {
    home: "หน้าแรก",
    brands: "แบรนด์",
    howItWorks: "วิธีการทำงาน",
    faq: "คำถามที่พบบ่อย",
    learn: "เรียนรู้",
    quest: "Quest",
    startEarning: "เริ่มรับเงินคืน",
    mainNavAria: "เมนูนำทางหลัก",
    toggleMenuAria: "เปิดหรือปิดเมนู",
  },
  tw: {
    home: "首頁",
    brands: "品牌",
    howItWorks: "運作方式",
    faq: "常見問題",
    learn: "學習專區",
    quest: "Quest",
    startEarning: "開始賺回饋",
    mainNavAria: "主要導覽",
    toggleMenuAria: "開啟或關閉選單",
  },
  cn: {
    home: "首页",
    brands: "品牌",
    howItWorks: "运作方式",
    faq: "常见问题",
    learn: "学习中心",
    quest: "Quest",
    startEarning: "开始赚回馈",
    mainNavAria: "主导航",
    toggleMenuAria: "打开或关闭菜单",
  },
  ja: {
    home: "ホーム",
    brands: "ブランド",
    howItWorks: "仕組み",
    faq: "よくある質問",
    learn: "学ぶ",
    quest: "Quest",
    startEarning: "還元を始める",
    mainNavAria: "メインナビゲーション",
    toggleMenuAria: "メニューを開く",
  },
  id: {
    home: "Beranda",
    brands: "Brand",
    howItWorks: "Cara kerja",
    faq: "FAQ",
    learn: "Pelajari",
    quest: "Quest",
    startEarning: "Mulai dapat cashback",
    mainNavAria: "Navigasi utama",
    toggleMenuAria: "Buka atau tutup menu",
  },
};

export type HeaderNavLocaleKey = keyof typeof LABELS;

/** Map pathname to UI language for header labels (includes `/id` → Indonesian). */
export function headerNavLocaleFromPathname(pathname: string): HeaderNavLocaleKey {
  if (pathname === "/th" || pathname.startsWith("/th/")) return "th";
  if (pathname === "/tw" || pathname.startsWith("/tw/")) return "tw";
  if (pathname === "/cn" || pathname.startsWith("/cn/")) return "cn";
  if (pathname === "/ja" || pathname.startsWith("/ja/")) return "ja";
  if (pathname === "/id" || pathname.startsWith("/id/")) return "id";
  return "en";
}

export function getHeaderNavLabelsForPathname(pathname: string): HeaderNavLabels {
  return LABELS[headerNavLocaleFromPathname(pathname)];
}
