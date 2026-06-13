export type TaiwanFaqEntry = { question: string; answer: string };

/** Order: how it works → timing → withdraw → free → … */
export const TAIWAN_FAQ_ITEMS: TaiwanFaqEntry[] = [
  {
    question: "GoGoCash 的現金回饋怎麼計算？",
    answer:
      "透過 GoGoCash 連結或 Mini App 前往合作商家購物並完成付款；商家確認訂單後，系統會將現金回饋計入你的 GoGoCash 錢包。",
  },
  {
    question: "回饋多久會入帳？",
    answer:
      "一般約在商家確認訂單後 1–3 個工作天內；大型促銷或旅遊類訂單可能稍長。",
  },
  {
    question: "如何提領？",
    answer:
      "達到錢包顯示的最低提領金額後，可提領至支援的銀行帳戶或電子錢包，多數在 1–3 個工作天內處理。",
  },
  {
    question: "需要付費嗎？有手續費嗎？",
    answer:
      "使用 GoGoCash 免費，沒有會員費或隱藏手續費 — 只要透過平台前往商家消費即可累積回饋。",
  },
  {
    question: "有哪些商家？",
    answer:
      "東南亞有超過 70 個品牌夥伴，例如 Shopee、Lazada、Agoda 等；最新名單請在 App 或首頁查看。",
  },
  {
    question: "若回饋沒有入帳怎麼辦？",
    answer:
      "請務必從 GoGoCash 開始購物流程，暫時關閉會阻擋追蹤的外掛、允許 Cookie；若仍無紀錄，請聯絡客服並提供訂單編號與付款證明。",
  },
];
