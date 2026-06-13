import { SITE_FACTS } from "@/lib/site-facts";
import type { LocaleHomeCopy } from "@/lib/locale-home-copy";

/** Mainland China (Simplified Chinese) landing — align numbers with `SITE_FACTS`. */
export const CN_HOME = {
  langNavEnglish: "English site",
  langNavLocal: "简体中文（中国）",
  breadcrumbNavAria: "语言",

  hero: {
    h1: "每次消费都能赚回馈",
    sub: "GoGoCash — 在你熟悉的商家消费",
    body: `最高 30% 现金回馈，超过 ${SITE_FACTS.partnerCountLabel} 个品牌 — ${SITE_FACTS.keyMerchantsShort} 等，涵盖东南亚。免费加入，真实回馈进钱包；完成 App 任务再加码。`,
    ctaLaunch: "开始赚回馈",
    ctaLine: "LINE 问问我们",
    lineAria: "通过 LINE 联系 GoGoCash",
  },

  partners: {
    badge: "品牌伙伴",
    title: "在你熟悉的品牌赚现金回馈",
    description: `在你本来就会逛的品牌赚回馈 — 超过 ${SITE_FACTS.partnerCountLabel} 个伙伴，涵盖${SITE_FACTS.regionLabel}。结账前从 GoGoCash 开启商家，系统会追踪并在订单确认后核实回馈。`,
    searchLabel: "搜寻品牌",
    searchPlaceholder: "输入品牌名称或类别…",
    searchClear: "清除",
    noResults: "找不到符合的品牌，请试试其他关键字",
    brandsCountAll: "共 {count} 个品牌",
    brandsCountFiltered: "显示 {filtered} / {total} 个品牌",
    loadMore: "载入更多品牌",
  },

  why: {
    badge: "为什么选 GoGoCash",
    title: "为东南亚日常消费而设计",
    subtitle:
      "看见回馈进钱包、商家你信赖、奖励能提领 — 网页与 Mini App 都能用。",
    cards: [
      {
        title: "回馈进钱包，不是模糊点数",
        body: "商家确认后看见余额增加 — 可花用，也可通过 Saving Plus 累积成长。",
      },
      {
        title: "值得信赖的商家",
        body: `在东南亚超过 ${SITE_FACTS.partnerCountLabel} 个知名品牌消费，买前先看清回馈比例。`,
      },
      {
        title: "为你量身打造的任务",
        body: "依你的购物习惯推出挑战与档期限定加码。",
      },
      {
        title: "需要时就找得到支援",
        body: "追踪或提领有疑问？团队随时协助。",
      },
    ],
  },

  features: {
    badge: "重点功能",
    title: "为什么更容易赚到回馈",
    cards: [
      {
        title: "看见回馈进钱包",
        body: "商家确认订单后，真实现金回馈入账 — 没有难懂的点数，在 App 里追踪余额。",
      },
      {
        title: "全天候客服",
        body: "追踪或提领有疑问？团队通过聊天与电子邮件随时协助。",
      },
      {
        title: "个性化任务",
        body: "依你的消费习惯解锁挑战，额外奖励与专属优惠。",
      },
    ],
    ctaCard: {
      title: "准备开始赚回馈了吗？",
      bodyLine: `超过 ${SITE_FACTS.shopperCommunityLabel} 位用户正在轻松累积现金回馈`,
      cta: "开始赚回馈",
    },
  },

  howItWorks: {
    title: "三步骤，拿到第一笔现金回馈",
    intro:
      "从 GoGoCash 开商家、照平常结账，商家确认后回馈进钱包 — 就这么简单。",
    progressCue: "三步骤 · 第一笔回馈",
    browseAppCta: "立即逛逛！",
    steps: [
      {
        summary: "选好要赚回馈的店",
        title: "从 GoGoCash 开启商家",
        desc: `浏览超过 ${SITE_FACTS.partnerCountLabel} 个电商与旅游伙伴，涵盖 ${SITE_FACTS.regionLabel}。比较回馈后从 GoGoCash 开启，让系统能追踪造访。`,
        bullets: [
          "Lazada、Shopee、Agoda、Samsung、Trip.com 等",
          "消费前先看透明回馈比例",
        ],
      },
      {
        summary: "照平常买",
        title: "在商家结账 — 流程不变",
        desc: "在商家网站或 App 加入购物车并付款，无需额外输入优惠码。",
        bullets: [
          "使用你原本的账号与付款方式",
          "GoGoCash 在背景追踪订单",
        ],
      },
      {
        summary: "回馈进钱包",
        title: "商家确认后入账",
        desc: "订单确认后，现金回馈进入 GoGoCash 钱包。在 App 追踪余额，达门槛即可提领 — 真钱，不是点数。",
        bullets: ["通常几天内确认", "满额可提领至银行或电子钱包"],
      },
    ],
  },

  download: {
    badge: "开启 App",
    title: "用你熟悉的 App 使用 GoGoCash",
    desc: "Telegram 或 LINE Mini App，或直接开网页版 — 回馈相同，小屏幕也顺手。",
    bullets: ["随时查看优惠与任务", "回馈加码时收到通知"],
    scanLabel: "扫描开启",
    qrCaptionBefore: "开启",
    qrCaptionLink: "GoGoCash LINE Mini App",
    qrCaptionAfter: " — 或使用左侧 Telegram／网页版",
    telegram: "Telegram Mini App",
    line: "LINE Mini App",
    web: "开启网页版",
    qrAria: "扫描开启 GoGoCash LINE Mini App",
    qrAlt: "开启 GoGoCash LINE Mini App 的 QR Code",
  },

  learn: {
    badge: "学习中心",
    title: "聪明省钱，简单说明",
    readMore: "阅读全文",
    teasers: [
      {
        title: "现金回馈如何追踪",
        desc: "从点击到商家确认，背后发生什么事。",
        href: "/learn/how-cashback-works",
      },
      {
        title: "提领至银行或电子钱包",
        desc: "门槛、时间与「已确认」余额代表什么。",
        href: "/learn/withdraw-cashback-gogocash",
      },
      {
        title: "回馈没入账？",
        desc: "联络客服前的简短检查清单。",
        href: "/learn/cashback-not-tracking-fixes",
      },
    ],
  },

  community: {
    badge: "社群",
    title: "加入 GoGoCash 社群",
    desc: "与团队和其他用户交流心得、优惠与支援 — 选择你常用的频道。",
  },

  faq: {
    badge: "常见问题",
    title: "关于 GoGoCash 的常见问题",
    subtitleEnHint: "更多英文详情请见首页或 Learn 文章",
  },

  finalCta: {
    title: "准备好每次消费都赚回馈了吗？",
    sub: `与超过 ${SITE_FACTS.shopperCommunityLabel} 位用户一起轻松累积现金回馈`,
    cta: "开始赚回馈",
  },
} satisfies LocaleHomeCopy;
