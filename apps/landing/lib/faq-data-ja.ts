export type JapanFaqEntry = { question: string; answer: string };

/** Order: how it works → timing → withdraw → free → … */
export const JAPAN_FAQ_ITEMS: JapanFaqEntry[] = [
  {
    question: "GoGoCash のキャッシュバックはどうやって貯まりますか？",
    answer:
      "GoGoCash のリンクまたはミニアプリから提携店で通常どおり購入します。店舗が注文を確認すると、キャッシュバックが GoGoCash ウォレットに反映されます。",
  },
  {
    question: "還元が付与されるまでどのくらいかかりますか？",
    answer:
      "一般的に店舗が注文を確認してから 1〜3 営業日程度です。大型セールや旅行予約はやや長くなる場合があります。",
  },
  {
    question: "出金の方法は？",
    answer:
      "ウォレットに表示された最低出金額に達すると、対応する銀行口座または e ウォレットへ出金できます。多くの場合 1〜3 営業日で処理されます。",
  },
  {
    question: "利用料や手数料はかかりますか？",
    answer:
      "GoGoCash の利用は無料で、会費や隠れた手数料はありません。プラットフォーム経由で買い物するだけで還元が貯まります。",
  },
  {
    question: "どんな店舗がありますか？",
    answer:
      "東南アジアで 70 以上のブランドと提携しています（例：Shopee、Lazada、Agoda）。最新一覧はアプリまたはトップページでご確認ください。",
  },
  {
    question: "キャッシュバックが付かない場合は？",
    answer:
      "必ず GoGoCash から購入を開始し、広告ブロッカーを一時オフにし、Cookie を許可してください。それでも付かない場合は、注文番号と支払い証明を添えてサポートへご連絡ください。",
  },
];
