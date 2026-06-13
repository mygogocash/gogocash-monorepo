import type { FaqEntry } from "@/lib/faq-data";

/** Order: how it works → timing → withdraw → free → … (Simplified Chinese) */
export const CHINA_FAQ_ITEMS: FaqEntry[] = [
  {
    question: "GoGoCash 的现金回馈怎么计算？",
    answer:
      "通过 GoGoCash 链接或 Mini App 前往合作商家购物并完成付款；商家确认订单后，系统会将现金回馈计入你的 GoGoCash 钱包。",
  },
  {
    question: "回馈多久会入账？",
    answer:
      "一般约在商家确认订单后 1–3 个工作日内；大型促销或旅游类订单可能稍长。",
  },
  {
    question: "如何提领？",
    answer:
      "达到钱包显示的最低提领金额后，可提领至支持的银行账户或电子钱包，多数在 1–3 个工作日内处理。",
  },
  {
    question: "需要付费吗？有手续费吗？",
    answer:
      "使用 GoGoCash 免费，没有会员费或隐藏手续费 — 只要通过平台前往商家消费即可累积回馈。",
  },
  {
    question: "有哪些商家？",
    answer:
      "东南亚有超过 70 个品牌伙伴，例如 Shopee、Lazada、Agoda 等；最新名单请在 App 或首页查看。",
  },
  {
    question: "若回馈没有入账怎么办？",
    answer:
      "请务必从 GoGoCash 开始购物流程，暂时关闭会阻挡追踪的插件、允许 Cookie；若仍无纪录，请联络客服并提供订单编号与付款证明。",
  },
];
