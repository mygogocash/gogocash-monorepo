import { SITE_FACTS } from "@/lib/site-facts";
import type { LocaleHomeCopy } from "@/lib/locale-home-copy";

/** Japanese landing — align numbers with `SITE_FACTS`. */
export const JA_HOME = {
  langNavEnglish: "English site",
  langNavLocal: "日本語",
  breadcrumbNavAria: "言語",

  hero: {
    h1: "毎回のお支払いでキャッシュバック",
    sub: "GoGoCash — いつものお店で",
    body: `${SITE_FACTS.partnerCountLabel} 以上のストアで最大 30% のキャッシュバック — ${SITE_FACTS.keyMerchantsShort} など、${SITE_FACTS.regionLabel}。無料で本物の還元がウォレットに。クエストでボーナスも。`,
    ctaLaunch: "還元を始める",
    ctaLine: "LINE で相談",
    lineAria: "LINE で GoGoCash に問い合わせる",
  },

  partners: {
    badge: "ブランドパートナー",
    title: "いつも使うブランドでキャッシュバック",
    description: `いつものブランドで還元を — ${SITE_FACTS.partnerCountLabel} 以上のパートナー（${SITE_FACTS.regionLabel} など）。購入前に GoGoCash からストアを開き、注文確認後に還元が確定しやすくなります。`,
    searchLabel: "ブランドを検索",
    searchPlaceholder: "ブランド名やカテゴリを入力…",
    searchClear: "クリア",
    noResults: "該当するブランドが見つかりません。別のキーワードをお試しください。",
    brandsCountAll: "{count} ブランド",
    brandsCountFiltered: "{filtered} / {total} 件を表示",
    loadMore: "さらにブランドを表示",
  },

  why: {
    badge: "GoGoCash を選ぶ理由",
    title: "東南アジアの日常買い物のために設計",
    subtitle:
      "ウォレットに還元がたまる実感、馴染みの店舗、出金できる特典 — Web とミニアプリの両方で。",
    cards: [
      {
        title: "ポイントではなくウォレットに還元",
        body: "店舗確認後に残高が増える実感 — 使うも Saving Plus で育てるもあなた次第。",
      },
      {
        title: "信頼できる加盟店",
        body: `東南アジアの ${SITE_FACTS.partnerCountLabel} 以上の有名ブランドで、購入前に還元率を確認。`,
      },
      {
        title: "あなた向けのクエスト",
        body: "買い物の習慣に合わせたチャレンジとシーズン特典。",
      },
      {
        title: "必要なときのサポート",
        body: "トラッキングや出金で不明点があれば、チームがサポートします。",
      },
    ],
  },

  features: {
    badge: "主な機能",
    title: "還元を積み上げやすい理由",
    cards: [
      {
        title: "還元がウォレットに入る",
        body: "注文が確認されるとキャッシュバックが反映 — ポイントの複雑な計算なし。アプリで残高を追跡。",
      },
      {
        title: "24時間365日サポート",
        body: "トラッキングや出金で不明点があれば、チャットとメールでサポートします。",
      },
      {
        title: "パーソナライズされたクエスト",
        body: "あなたの買い方に合ったチャレンジでボーナスや限定オファーを解放。",
      },
    ],
    ctaCard: {
      title: "キャッシュバックを始めますか？",
      bodyLine: `${SITE_FACTS.shopperCommunityLabel} 以上のユーザーが簡単に還元を積み立て中`,
      cta: "還元を始める",
    },
  },

  howItWorks: {
    title: "はじめてのキャッシュバックまで 3 ステップ",
    intro:
      "GoGoCash から店を開き、いつも通り購入。店舗が確認したらウォレットに還元 — シンプルです。",
    progressCue: "3 ステップで最初の還元へ",
    browseAppCta: "今すぐ見る",
    steps: [
      {
        summary: "還元を選ぶ",
        title: "GoGoCash から店舗を開く",
        desc: `${SITE_FACTS.regionLabel} の ${SITE_FACTS.partnerCountLabel} 以上の EC・旅行パートナーを探索。還元率を比較し、GoGoCash から開いて訪問をトラッキング。`,
        bullets: [
          "Lazada、Shopee、Agoda、Samsung、Trip.com など",
          "購入前に還元率を明示",
        ],
      },
      {
        summary: "いつも通り買う",
        title: "店舗で決済 — 普段の流れのまま",
        desc: "店舗のサイトまたはアプリでカートに入れて決済。クーポン入力は不要です。",
        bullets: [
          "いつものアカウントと支払い方法を利用",
          "GoGoCash が購入をバックグラウンドで追跡",
        ],
      },
      {
        summary: "ウォレットが増える",
        title: "確認後にキャッシュバック付与",
        desc: "注文が確認されると GoGoCash ウォレットに還元。アプリで残高を追跡し、条件を満たせば出金 — ポイントではなく現金の還元です。",
        bullets: ["通常数日以内に確認", "銀行または e ウォレットへ出金可能"],
      },
    ],
  },

  download: {
    badge: "アプリを開く",
    title: "お好みのアプリで GoGoCash",
    desc: "Telegram または LINE ミニアプリ、または Web アプリ — 還元は同じで、スマホ向けに最適化。",
    bullets: ["外出先でオファーやクエストをチェック", "還元率アップの通知"],
    scanLabel: "スキャンして開く",
    qrCaptionBefore: "開く：",
    qrCaptionLink: "GoGoCash LINE ミニアプリ",
    qrCaptionAfter: " — 左から Telegram / Web も利用可能",
    telegram: "Telegram ミニアプリ",
    line: "LINE ミニアプリ",
    web: "Web アプリを開く",
    qrAria: "GoGoCash LINE ミニアプリを開く（QR）",
    qrAlt: "GoGoCash LINE ミニアプリ用 QR コード",
  },

  learn: {
    badge: "学ぶ",
    title: "賢く貯める、わかりやすく解説",
    readMore: "続きを読む",
    teasers: [
      {
        title: "キャッシュバックの追跡の仕組み",
        desc: "クリックから店舗確認まで、裏側で何が起きるか。",
        href: "/learn/how-cashback-works",
      },
      {
        title: "銀行・e ウォレットへ出金",
        desc: "最低額、タイミング、「確定」残高の意味。",
        href: "/learn/withdraw-cashback-gogocash",
      },
      {
        title: "還元が付かない？",
        desc: "サポートに連絡する前の短いチェックリスト。",
        href: "/learn/cashback-not-tracking-fixes",
      },
    ],
  },

  community: {
    badge: "コミュニティ",
    title: "GoGoCash コミュニティに参加",
    desc: "チームや他のユーザーからヒント・情報・サポートを — よく使うチャンネルを選べます。",
  },

  faq: {
    badge: "よくある質問",
    title: "GoGoCash に関する FAQ",
    subtitleEnHint: "詳細は英語のトップページまたは Learn の記事をご覧ください",
  },

  finalCta: {
    title: "毎回のお支払いで還元を積みませんか？",
    sub: `${SITE_FACTS.shopperCommunityLabel} 以上のユーザーと一緒に、かんたんにキャッシュバック`,
    cta: "還元を始める",
  },
} satisfies LocaleHomeCopy;
