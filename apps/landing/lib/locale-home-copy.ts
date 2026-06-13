/**
 * Shared shape for localized marketing homepages (`/th`, `/tw`, `/ja`, `/cn`).
 * Implementations live in `lib/copy-*-home.ts`; the active map is
 * `LOCALE_HOME_COPY` in `locale-home-registry.ts`.
 */
export type LocaleHomeWhyCard = { title: string; body: string };
export type LocaleHomeFeatureCard = { title: string; body: string };
export type LocaleHomeHowStep = {
  summary: string;
  title: string;
  desc: string;
  bullets: readonly string[];
};
export type LocaleHomeLearnTeaser = {
  title: string;
  desc: string;
  href: string;
};

export type LocaleHomeCopy = {
  langNavEnglish: string;
  langNavLocal: string;
  breadcrumbNavAria: string;
  hero: {
    h1: string;
    sub: string;
    body: string;
    ctaLaunch: string;
    ctaLine: string;
    lineAria: string;
  };
  partners: {
    badge: string;
    title: string;
    /** Section intro under the title. */
    description: string;
    /** Accessible label for the brand search field. */
    searchLabel: string;
    searchPlaceholder: string;
    /** Label for the control that clears the search field. */
    searchClear: string;
    noResults: string;
    /** Replace `{count}` with the total number of brands. */
    brandsCountAll: string;
    /** Replace `{filtered}` and `{total}` when a search filter is active. */
    brandsCountFiltered: string;
    /** Button to reveal more brand cards after the initial batch. */
    loadMore: string;
  };
  why: {
    badge: string;
    title: string;
    subtitle: string;
    cards: readonly LocaleHomeWhyCard[];
  };
  features: {
    badge: string;
    title: string;
    cards: readonly [
      LocaleHomeFeatureCard,
      LocaleHomeFeatureCard,
      LocaleHomeFeatureCard,
    ];
    ctaCard: { title: string; bodyLine: string; cta: string };
  };
  howItWorks: {
    title: string;
    intro: string;
    /** Short progress cue under intro (e.g. “Three steps to your first cashback”). */
    progressCue: string;
    /** Primary CTA label for step 1 (browse partners → web app). */
    browseAppCta: string;
    steps: readonly [
      LocaleHomeHowStep,
      LocaleHomeHowStep,
      LocaleHomeHowStep,
    ];
  };
  download: {
    badge: string;
    title: string;
    desc: string;
    bullets: readonly string[];
    scanLabel: string;
    qrCaptionBefore: string;
    qrCaptionLink: string;
    qrCaptionAfter: string;
    telegram: string;
    line: string;
    web: string;
    qrAria: string;
    qrAlt: string;
  };
  learn: {
    badge: string;
    title: string;
    readMore: string;
    teasers: readonly [
      LocaleHomeLearnTeaser,
      LocaleHomeLearnTeaser,
      LocaleHomeLearnTeaser,
    ];
  };
  community: { badge: string; title: string; desc: string };
  faq: { badge: string; title: string; subtitleEnHint: string };
  finalCta: { title: string; sub: string; cta: string };
};
