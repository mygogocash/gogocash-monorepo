import { SITE_FACTS } from "@/lib/site-facts";
import type { LocaleHomeCopy } from "@/lib/locale-home-copy";

/** Taiwan (Traditional Chinese) landing — align numbers with `SITE_FACTS`. */
export const TW_HOME = {
  langNavEnglish: "English site",
  langNavLocal: "繁體中文（台灣）",
  breadcrumbNavAria: "語言",

  hero: {
    h1: "每次消費都能賺回饋",
    sub: "GoGoCash — 在你熟悉的商家消費",
    body: `最高 30% 現金回饋，超過 ${SITE_FACTS.partnerCountLabel} 個品牌 — ${SITE_FACTS.keyMerchantsShort} 等，涵蓋東南亞。免費加入，真實回饋進錢包；完成 App 任務再加碼。`,
    ctaLaunch: "開始賺回饋",
    ctaLine: "LINE 問問我們",
    lineAria: "透過 LINE 聯絡 GoGoCash",
  },

  partners: {
    badge: "品牌夥伴",
    title: "在你熟悉的品牌賺現金回饋",
    description: `在你本來就會逛的品牌賺回饋 — 超過 ${SITE_FACTS.partnerCountLabel} 個夥伴，涵蓋${SITE_FACTS.regionLabel}。結帳前從 GoGoCash 開啟商家，系統會追蹤並在訂單確認後核實回饋。`,
    searchLabel: "搜尋品牌",
    searchPlaceholder: "輸入品牌名稱或類別…",
    searchClear: "清除",
    noResults: "找不到符合的品牌，請試試其他關鍵字",
    brandsCountAll: "共 {count} 個品牌",
    brandsCountFiltered: "顯示 {filtered} / {total} 個品牌",
    loadMore: "載入更多品牌",
  },

  why: {
    badge: "為什麼選 GoGoCash",
    title: "為東南亞日常消費而設計",
    subtitle:
      "看見回饋進錢包、商家你信賴、獎勵能提領 — 網頁與 Mini App 都能用。",
    cards: [
      {
        title: "回饋進錢包，不是模糊點數",
        body: "商家確認後看見餘額增加 — 可花用，也可透過 Saving Plus 累積成長。",
      },
      {
        title: "值得信賴的商家",
        body: `在東南亞超過 ${SITE_FACTS.partnerCountLabel} 個知名品牌消費，買前先看清回饋比例。`,
      },
      {
        title: "為你量身打造的任務",
        body: "依你的購物習慣推出挑戰與檔期限定加碼。",
      },
      {
        title: "需要時就找得到支援",
        body: "追蹤或提領有疑問？團隊隨時協助。",
      },
    ],
  },

  features: {
    badge: "重點功能",
    title: "為什麼更容易賺到回饋",
    cards: [
      {
        title: "看見回饋進錢包",
        body: "商家確認訂單後，真實現金回饋入帳 — 沒有難懂的點數，在 App 裡追蹤餘額。",
      },
      {
        title: "全天候客服",
        body: "追蹤或提領有疑問？團隊透過聊天與電子郵件隨時協助。",
      },
      {
        title: "個人化任務",
        body: "依你的消費習慣解鎖挑戰，額外獎勵與專屬優惠。",
      },
    ],
    ctaCard: {
      title: "準備開始賺回饋了嗎？",
      bodyLine: `超過 ${SITE_FACTS.shopperCommunityLabel} 位用戶正在輕鬆累積現金回饋`,
      cta: "開始賺回饋",
    },
  },

  howItWorks: {
    title: "三步驟，拿到第一筆現金回饋",
    intro:
      "從 GoGoCash 開商家、照平常結帳，商家確認後回饋進錢包 — 就這麼簡單。",
    progressCue: "三步驟 · 第一筆回饋",
    browseAppCta: "立即逛逛！",
    steps: [
      {
        summary: "選好要賺回饋的店",
        title: "從 GoGoCash 開啟商家",
        desc: `瀏覽超過 ${SITE_FACTS.partnerCountLabel} 個電商與旅遊夥伴，涵蓋 ${SITE_FACTS.regionLabel}。比較回饋後從 GoGoCash 開啟，讓系統能追蹤造訪。`,
        bullets: [
          "Lazada、Shopee、Agoda、Samsung、Trip.com 等",
          "消費前先看透明回饋比例",
        ],
      },
      {
        summary: "照平常買",
        title: "在商家結帳 — 流程不變",
        desc: "在商家網站或 App 加入購物車並付款，無需額外輸入優惠碼。",
        bullets: [
          "使用你原本的帳號與付款方式",
          "GoGoCash 在背景追蹤訂單",
        ],
      },
      {
        summary: "回饋進錢包",
        title: "商家確認後入帳",
        desc: "訂單確認後，現金回饋進入 GoGoCash 錢包。在 App 追蹤餘額，達門檻即可提領 — 真錢，不是點數。",
        bullets: ["通常幾天內確認", "滿額可提領至銀行或電子錢包"],
      },
    ],
  },

  download: {
    badge: "開啟 App",
    title: "用你熟悉的 App 使用 GoGoCash",
    desc: "Telegram 或 LINE Mini App，或直接開網頁版 — 回饋相同，小螢幕也順手。",
    bullets: ["隨時查看優惠與任務", "回饋加碼時收到通知"],
    scanLabel: "掃描開啟",
    qrCaptionBefore: "開啟",
    qrCaptionLink: "GoGoCash LINE Mini App",
    qrCaptionAfter: " — 或使用左側 Telegram／網頁版",
    telegram: "Telegram Mini App",
    line: "LINE Mini App",
    web: "開啟網頁版",
    qrAria: "掃描開啟 GoGoCash LINE Mini App",
    qrAlt: "開啟 GoGoCash LINE Mini App 的 QR Code",
  },

  learn: {
    badge: "學習中心",
    title: "聰明省錢，簡單說明",
    readMore: "閱讀全文",
    teasers: [
      {
        title: "現金回饋如何追蹤",
        desc: "從點擊到商家確認，背後發生什麼事。",
        href: "/learn/how-cashback-works",
      },
      {
        title: "提領至銀行或電子錢包",
        desc: "門檻、時間與「已確認」餘額代表什麼。",
        href: "/learn/withdraw-cashback-gogocash",
      },
      {
        title: "回饋沒入帳？",
        desc: "聯絡客服前的簡短檢查清單。",
        href: "/learn/cashback-not-tracking-fixes",
      },
    ],
  },

  community: {
    badge: "社群",
    title: "加入 GoGoCash 社群",
    desc: "與團隊和其他用戶交流心得、優惠與支援 — 選擇你常用的頻道。",
  },

  faq: {
    badge: "常見問題",
    title: "關於 GoGoCash 的常見問題",
    subtitleEnHint: "更多英文詳情請見首頁或 Learn 文章",
  },

  finalCta: {
    title: "準備好每次消費都賺回饋了嗎？",
    sub: `與超過 ${SITE_FACTS.shopperCommunityLabel} 位用戶一起輕鬆累積現金回饋`,
    cta: "開始賺回饋",
  },
} satisfies LocaleHomeCopy;
