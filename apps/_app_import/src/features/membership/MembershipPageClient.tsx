"use client";

import "./membership.css";

import Image from "next/image";
import { Check, Headphones, Plus, Sparkles, Star, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";

import { useMembershipLanding, type MembershipLandingI18n } from "./useMembershipLanding";
import { useStripeCheckout } from "./useStripeCheckout";

const STARTER_PRICE_MONTHLY = 49;
const STARTER_PRICE_ANNUAL = 490;
const STARTER_PRICE_ANNUAL_EFFECTIVE = 41;
const MONTHLY_STACK = 588;
const ANNUAL_SAVE = 98;

type PartnerBrand = {
  name: string;
  src: string;
};

function PartnerLogoPill({ brand }: { brand: PartnerBrand }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const logoFailed = failedSrc === brand.src;

  return (
    <span className="partner-logo-pill" title={brand.name}>
      {!logoFailed ? (
        <Image
          src={brand.src}
          width={24}
          height={24}
          alt={brand.name}
          unoptimized
          onError={() => setFailedSrc(brand.src)}
        />
      ) : (
        <span className="partner-logo-fallback" aria-hidden>
          {brand.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span>{brand.name}</span>
    </span>
  );
}

export default function MembershipPageClient() {
  const t = useTranslations("membership");
  const rootRef = useRef<HTMLDivElement>(null);
  const noiseId = `mship-noise-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const landingI18n: MembershipLandingI18n = useMemo(
    () => ({ countdownEnded: t("countdownEnded") }),
    [t]
  );

  const { theme } = useMembershipLanding(rootRef, landingI18n);

  const checkoutMessages = useMemo(
    () => ({
      loginRequired: t("stripeLoginRequired"),
      checkoutError: t("stripeCheckoutError"),
      notConfigured: t("stripeNotConfigured"),
      disabled: t("stripeBillingDisabled"),
    }),
    [t]
  );

  const { startCheckout, pending, stripeBillingEnabled } = useStripeCheckout(
    rootRef,
    checkoutMessages
  );

  const [billingAnnual, setBillingAnnual] = useState(true);
  const memberBenefits = t.raw("memberBenefits") as string[];
  const faqItems = t.raw("faq") as { q: string; a: string }[];

  const benefitIcons = useMemo(() => [Wallet, Sparkles, Star, Headphones] as const, []);

  const benefitBlocks = useMemo(() => {
    return benefitIcons.map((Icon, i) => ({
      Icon,
      title: memberBenefits[i] ?? "",
      body: "",
    }));
  }, [benefitIcons, memberBenefits]);

  return (
    <div ref={rootRef} className="membership-root font-sans antialiased" data-theme={theme}>
      <div className="mship-layout">
        <main className="mship-main">
          <section className="hero-section section" aria-labelledby="hero-title">
            <svg className="hero-noise" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <filter id={noiseId}>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.8"
                  numOctaves="4"
                  stitchTiles="stitch"
                />
              </filter>
              <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
            </svg>
            <div className="container hero-grid">
              <div>
                <h1 id="hero-title" className="hero-title">
                  {t("heroH1")}
                </h1>
                <p className="hero-body">{t("heroBody")}</p>
                <ul className="hero-benefits" aria-label={t("heroBenefitsAria")}>
                  {memberBenefits.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>

                <div className="hero-pricing-row" role="presentation">
                  <button
                    type="button"
                    className={`hero-price-card hero-price-card--monthly ${!billingAnnual ? "is-selected" : ""}`}
                    onClick={() => setBillingAnnual(false)}
                    aria-pressed={!billingAnnual}
                  >
                    <span className="hero-price-label">{t("planMonthly")}</span>
                    <span className="hero-price-amount">
                      ฿{STARTER_PRICE_MONTHLY}
                      <span className="hero-price-period">{t("perMonthShort")}</span>
                    </span>
                    <span className="hero-price-hint">{t("planMonthlyHint")}</span>
                  </button>
                  <button
                    type="button"
                    className={`hero-price-card hero-price-card--annual ${billingAnnual ? "is-selected" : ""}`}
                    onClick={() => setBillingAnnual(true)}
                    aria-pressed={billingAnnual}
                  >
                    <span className="hero-price-badge">{t("bestValue")}</span>
                    <span className="hero-price-label">{t("planAnnual")}</span>
                    <span className="hero-price-amount hero-price-amount--lg">
                      ฿{STARTER_PRICE_ANNUAL}
                      <span className="hero-price-period">{t("perYearShort")}</span>
                    </span>
                    <span className="hero-price-effective">
                      {t("annualEffectiveLine", {
                        amount: STARTER_PRICE_ANNUAL_EFFECTIVE,
                      })}
                    </span>
                    <span className="hero-price-save">{t("annualSave")}</span>
                  </button>
                </div>

                <p className="hero-plan-name">{t("planUnlimitedName")}</p>

                <div className="hero-actions">
                  {stripeBillingEnabled ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary btn-ripple"
                        disabled={pending}
                        aria-busy={pending}
                        onClick={() => void startCheckout("starter", { interval: "year" })}
                      >
                        {t("ctaAnnual")}
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-ripple hero-cta-secondary"
                        disabled={pending}
                        aria-busy={pending}
                        onClick={() => void startCheckout("starter", { interval: "month" })}
                      >
                        {t("ctaMonthly")}
                      </button>
                    </>
                  ) : (
                    <>
                      <a className="btn-primary btn-ripple" href="#pricing">
                        {t("ctaAnnual")}
                      </a>
                      <a className="btn-outline btn-ripple hero-cta-secondary" href="#pricing">
                        {t("ctaMonthly")}
                      </a>
                    </>
                  )}
                  <a className="link-bounce" href="#benefits">
                    {t("seeBenefits")}{" "}
                    <span className="arr" aria-hidden="true">
                      ↓
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="pricing">
            <div className="container">
              <div className="section-head section-head--pricing">
                <h2 className="section-title">{t("pricingSectionTitle")}</h2>
                <p className="section-subtitle pricing-section-subtitle">
                  {t("pricingSectionSubtitle")}
                </p>
              </div>
            </div>
            <div className="mship-bleed" data-testid="membership-bleed-pricing">
              <div className="pricing-billing-header">
                <p className="billing-nudge">{t("billingAnnualNudge")}</p>
                <div
                  id="billing-toggle"
                  data-annual={billingAnnual ? "true" : "false"}
                  role="group"
                  aria-label={t("billingAria")}
                >
                  <button
                    type="button"
                    id="bill-monthly"
                    data-billing="monthly"
                    className={!billingAnnual ? "active" : undefined}
                    onClick={() => setBillingAnnual(false)}
                  >
                    <span className="billing-choice-eyebrow">{t("monthly")}</span>
                    <span className="billing-choice-hint">{t("billingMonthlyHint")}</span>
                  </button>
                  <button
                    type="button"
                    id="bill-annual"
                    className={billingAnnual ? "active" : undefined}
                    data-billing="annual"
                    onClick={() => setBillingAnnual(true)}
                  >
                    <span className="billing-choice-badge">{t("bestValue")}</span>
                    <span className="billing-choice-eyebrow billing-choice-eyebrow--lg">
                      {t("annual")}
                    </span>
                    <span className="billing-choice-save">{t("annualSave")}</span>
                    <span className="billing-choice-hint">{t("billingAnnualHint")}</span>
                  </button>
                </div>
              </div>
              <div className="pricing-grid pricing-grid--dual">
                <article
                  className={`pricing-card pc-monthly ${!billingAnnual ? "pricing-card--focus" : ""}`}
                >
                  <div className="pc-head">
                    <h3 className="pc-tier-title">{t("planMonthly")}</h3>
                  </div>
                  <div className="pc-price">
                    <span>
                      ฿{STARTER_PRICE_MONTHLY}
                      {t("perMonthShort")}
                    </span>
                  </div>
                  <p className="pc-tagline">{t("planMonthlyHint")}</p>
                  <ul className="pc-features">
                    {memberBenefits.map((line) => (
                      <li key={line} className="ok">
                        <Check className="feat-icon" width={18} height={18} aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {stripeBillingEnabled ? (
                    <button
                      type="button"
                      className="btn-outline btn-ripple"
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() => void startCheckout("starter", { interval: "month" })}
                    >
                      {t("ctaCheckoutMonthly")}
                    </button>
                  ) : (
                    <a className="btn-outline btn-ripple" href="#pricing">
                      {t("ctaCheckoutMonthly")}
                    </a>
                  )}
                </article>
                <article
                  className={`pricing-card pc-annual pricing-card-featured ${billingAnnual ? "pricing-card--focus" : ""}`}
                >
                  <div className="pc-head">
                    <span className="pc-best-pill">{t("bestValue")}</span>
                    <h3 className="pc-tier-title">{t("planAnnual")}</h3>
                  </div>
                  <div className="pc-price">
                    <span>
                      ฿{STARTER_PRICE_ANNUAL}
                      {t("perYearShort")}
                    </span>
                  </div>
                  <p className="pc-effective">
                    {t("annualEffectiveLine", { amount: STARTER_PRICE_ANNUAL_EFFECTIVE })}
                  </p>
                  <ul className="pc-features">
                    {memberBenefits.map((line) => (
                      <li key={`a-${line}`} className="ok">
                        <Check className="feat-icon" width={18} height={18} aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {stripeBillingEnabled ? (
                    <button
                      type="button"
                      className="btn-primary btn-ripple"
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() => void startCheckout("starter", { interval: "year" })}
                    >
                      {t("ctaCheckoutAnnual")}
                    </button>
                  ) : (
                    <a className="btn-primary btn-ripple" href="#pricing">
                      {t("ctaCheckoutAnnual")}
                    </a>
                  )}
                </article>
              </div>
              <ul className="trust-strip" aria-label={t("trustStripLabel")}>
                <li>{t("trustBilledThb")}</li>
                <li>{t("trustCancelAnytime")}</li>
                <li>{t("trustAccessThroughPeriod")}</li>
              </ul>
            </div>
          </section>

          <section className="section" id="benefits">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("benefitsHeading")}</h2>
                <p className="section-subtitle">{t("benefitsSubtitle")}</p>
              </div>
              <div className="benefits-grid">
                {benefitBlocks.map(({ Icon, title, body }) => (
                  <div key={title} className="benefit-card reveal">
                    <div className="benefit-icon-wrap" aria-hidden>
                      <Icon className="benefit-icon" width={28} height={28} />
                    </div>
                    <h3 className="benefit-title">{title}</h3>
                    {body ? <p className="benefit-body">{body}</p> : null}
                  </div>
                ))}
              </div>
              <p className="benefits-footnote">{t("benefitsPointsFootnote")}</p>
            </div>
          </section>

          <section className="section" id="savings">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("savingsHeading")}</h2>
                <p className="section-subtitle">{t("savingsSubtitle")}</p>
              </div>
              <div className="savings-proof-card reveal">
                <div className="savings-row">
                  <span>{t("savingsMonthlyLine")}</span>
                  <span className="savings-value">฿{MONTHLY_STACK.toLocaleString("en-US")}</span>
                </div>
                <div className="savings-row">
                  <span>{t("savingsAnnualLine")}</span>
                  <span className="savings-value">
                    ฿{STARTER_PRICE_ANNUAL.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="savings-row savings-row--total">
                  <span>{t("savingsYouSave")}</span>
                  <span className="savings-value savings-value--accent">
                    ฿{ANNUAL_SAVE.toLocaleString("en-US")} (~16%)
                  </span>
                </div>
                <p className="savings-footnote">{t("savingsFootnote")}</p>
              </div>
            </div>
          </section>

          <section className="section" id="calculator">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("calcHeading")}</h2>
                <p className="section-subtitle">{t("calcSubtitle")}</p>
              </div>
            </div>
            <div className="calc-card">
              <div className="calc-input-group">
                <label className="calc-label" htmlFor="spend-input">
                  {t("spendLabel")}
                </label>
                <input
                  id="spend-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  defaultValue="3,000"
                  aria-describedby="spend-help"
                />
                <p id="spend-help" className="calc-hint">
                  {t("spendHelp")}
                </p>
                <input
                  id="spend-slider"
                  type="range"
                  min={500}
                  max={200000}
                  step={500}
                  defaultValue={3000}
                  aria-label={t("spendHelp")}
                />
              </div>
              <div className="calc-results">
                <div className="calc-col">
                  <div className="calc-tier">{t("calcFree")}</div>
                  <div id="pts-free" className="calc-pts" />
                  <div id="extra-free" className="calc-extra" />
                </div>
                <div className="calc-col">
                  <div className="calc-tier">{t("calcMember")}</div>
                  <div id="pts-starter" className="calc-pts" />
                  <div id="extra-starter" className="calc-extra" />
                </div>
              </div>
              <p className="leaving-line">
                {t("leavingPrefix")}
                <span id="leaving-behind">0</span>
                {t("leavingSuffix")}
              </p>
              <div className="partners-row">
                <span className="partners-label">{t("partnersLabel")}</span>
                {[
                  { name: "SHEIN", src: "/partners/shein.png" },
                  { name: "Shopee", src: "/partners/shopee.png" },
                  { name: "Lazada", src: "/partners/lazada.png" },
                  { name: "Lotus's", src: "/partners/lotus.png" },
                  { name: "Klook", src: "/partners/klook.png" },
                  { name: "GoWabi", src: "/partners/gowabi.png" },
                  { name: "agoda", src: "/partners/agoda.png" },
                  { name: "Adidas", src: "/partners/adidas.png" },
                  { name: "Traveloka", src: "/partners/traveloka.png" },
                  { name: "Trip.com", src: "/partners/trip.png" },
                  { name: "AirAsia", src: "/partners/airasia.png" },
                  { name: "Taobao", src: "/partners/taobao.png" },
                ].map((brand) => (
                  <PartnerLogoPill key={`${brand.name}-${brand.src}`} brand={brand} />
                ))}
              </div>
            </div>
            <div className="container calc-history-wrap">
              <Link href="/quest/history" className="btn-outline calc-history-btn">
                {t("calcHistoryCta")}
              </Link>
            </div>
          </section>

          <section className="section" id="social-proof">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("socialHeading")}</h2>
                <p className="section-subtitle">{t("socialSubtitle")}</p>
              </div>
            </div>
            <div className="stats-row stats-row--membership">
              <div className="stat-card reveal">
                <span data-count-to="220" data-suffix="+">
                  0
                </span>
                <p>{t("stat1")}</p>
              </div>
              <div className="stat-card reveal">
                <span data-count-to="16" data-suffix="%">
                  0
                </span>
                <p>{t("stat2")}</p>
              </div>
              <div className="stat-card reveal">
                <span>
                  ฿<span data-count-to="49">0</span>
                </span>
                <p>{t("stat3")}</p>
              </div>
            </div>
          </section>

          <section className="section" id="faq">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("faqHeading")}</h2>
                <p className="section-subtitle">{t("faqSubtitle")}</p>
              </div>
            </div>
            <div className="mship-bleed" data-testid="membership-bleed-faq">
              <div className="faq-wrap">
                {faqItems.map((item, i) => (
                  <div key={item.q} className="faq-item">
                    <button
                      type="button"
                      className="faq-question"
                      aria-expanded="false"
                      aria-controls={`faq-${i + 1}`}
                      id={`fq${i + 1}`}
                    >
                      <span>{item.q}</span>
                      <span className="faq-icon">
                        <Plus width={20} height={20} aria-hidden />
                      </span>
                    </button>
                    <div
                      className="faq-answer"
                      id={`faq-${i + 1}`}
                      role="region"
                      aria-labelledby={`fq${i + 1}`}
                    >
                      <p>{item.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
