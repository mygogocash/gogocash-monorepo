"use client";

import "./membership.css";

import Image from "next/image";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";

import { useMembershipLanding, type MembershipLandingI18n } from "./useMembershipLanding";
import { useStripeCheckout } from "./useStripeCheckout";

const STARTER_PRICE_MONTHLY = 69;
const STARTER_PRICE_ANNUAL_EFFECTIVE = 57;

function FeatureIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="feat-icon" width={18} height={18} aria-hidden />
  ) : (
    <Minus className="feat-icon" width={18} height={18} aria-hidden />
  );
}

export default function MembershipPageClient() {
  const t = useTranslations("membership");
  const rootRef = useRef<HTMLDivElement>(null);
  const noiseId = `mship-noise-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const landingI18n: MembershipLandingI18n = useMemo(
    () => ({
      streakZero: t("streakZero"),
      streakFmt: (done, ptsTotal) => t("streakFmt", { done, pts: ptsTotal.toLocaleString() }),
      questFmt: (done, ptsTotal) => t("questFmt", { done, pts: ptsTotal.toLocaleString() }),
      countdownEnded: t("countdownEnded"),
    }),
    [t]
  );

  const { theme, countdownText } = useMembershipLanding(rootRef, landingI18n);

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
  const starterPriceLabel = billingAnnual
    ? `฿${STARTER_PRICE_ANNUAL_EFFECTIVE}/mo`
    : `฿${STARTER_PRICE_MONTHLY}/mo`;

  const freeFeatures = t.raw("freeFeatures") as string[];
  const starterFeatures = t.raw("starterFeatures") as string[];
  const questTasks = t.raw("questTasks") as string[];
  const faqItems = t.raw("faq") as { q: string; a: string }[];

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
                <div className="eyebrow hero-eyebrow">
                  <div className="hero-eyebrow-campaign">
                    <span className="hero-eyebrow-icon" aria-hidden>
                      🏆
                    </span>
                    <div className="hero-eyebrow-copy">
                      <span className="hero-eyebrow-kicker">{t("heroEyebrowKicker")}</span>
                      <span className="hero-eyebrow-sep" aria-hidden>
                        ·
                      </span>
                      <span className="hero-eyebrow-period">{t("heroEyebrowPeriod")}</span>
                    </div>
                  </div>
                  <div className="hero-countdown-block">
                    <span className="hero-countdown-label">{t("heroCountdownLabel")}</span>
                    <span className="hero-countdown" aria-live="polite">
                      {countdownText}
                    </span>
                  </div>
                </div>
                <h1 id="hero-title" className="hero-title">
                  {t("heroH1")}
                </h1>
                <p className="hero-body">{t("heroBody")}</p>
                <div className="hero-tiers-row">
                  <div className="hero-tier-cell">
                    <div className="hero-card hero-card-free">
                      <h3>{t("tierFree")}</h3>
                      <div className="mult-badge mb-free">1×</div>
                      <div className="hero-pts">
                        <span id="hero-pts-free" data-suffix={t("ptsSuffix")}>
                          0
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hero-tier-cell">
                    <div className="hero-card hero-card-plus">
                      <h3>{t("tierStarter")}</h3>
                      <div className="mult-badge mb-plus badge-pulse">1.5×</div>
                      <div className="hero-pts">
                        <span id="hero-pts-starter" data-suffix={t("ptsSuffix")}>
                          0
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hero-actions">
                  {stripeBillingEnabled ? (
                    <button
                      type="button"
                      className="btn-primary btn-ripple"
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() => void startCheckout("plus")}
                    >
                      {t("unlockCta")}
                    </button>
                  ) : (
                    <a className="btn-primary btn-ripple" href="#pricing">
                      {t("unlockCta")}
                    </a>
                  )}
                  <a className="link-bounce" href="#calculator">
                    {t("seeHow")}{" "}
                    <span className="arr" aria-hidden="true">
                      ↓
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="calculator">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("calcHeading")}</h2>
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
                  max={50000}
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
                  <div className="calc-tier">{t("calcStarter")}</div>
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
                <Image
                  src="https://cdn.simpleicons.org/shopee/EE4D2D"
                  width={24}
                  height={24}
                  alt="Shopee"
                  unoptimized
                />
                <Image
                  src="https://cdn.simpleicons.org/lazada/0F146D"
                  width={24}
                  height={24}
                  alt="Lazada"
                  unoptimized
                />
                <span className="partner-pill badge-agoda">Agoda</span>
                <span className="partner-pill badge-klook">Klook</span>
                <span className="partner-pill badge-traveloka">Traveloka</span>
                <span className="partner-pill badge-lotus">Lotus&apos;s</span>
              </div>
            </div>
          </section>

          <section className="section" id="pricing">
            <div className="container">
              <div className="section-head section-head--pricing">
                <h2 className="section-title">{t("pickHeading")}</h2>
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
                    <span className="billing-choice-badge">{t("popular")}</span>
                    <span className="billing-choice-eyebrow billing-choice-eyebrow--lg">
                      {t("annual")}
                    </span>
                    <span className="billing-choice-save">{t("annualSave")}</span>
                    <span className="billing-choice-hint">{t("billingAnnualHint")}</span>
                  </button>
                </div>
              </div>
              <div className="pricing-grid">
                <article className="pricing-card pc-free">
                  <div className="pc-head">
                    <span className="mult-badge mb-free">1×</span>
                  </div>
                  <div className="pc-price">{t("freePrice")}</div>
                  <ul className="pc-features">
                    {freeFeatures.map((line, i) => (
                      <li key={line} className={i < 3 ? "ok" : "no"}>
                        <FeatureIcon ok={i < 3} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn-ghost" disabled>
                    {t("currentPlan")}
                  </button>
                </article>
                <article className="pricing-card">
                  <div className="pc-head">
                    <span
                      className="mult-badge mb-plus"
                      style={{ fontSize: "var(--text-sm)", minWidth: 40, minHeight: 40 }}
                    >
                      1.5×
                    </span>
                  </div>
                  <div className="pc-price">
                    <span id="price-starter">{starterPriceLabel}</span>{" "}
                    <span
                      id="price-orig-starter"
                      className="orig"
                      style={{
                        display: billingAnnual ? "inline" : "none",
                        textDecoration: "line-through",
                        color: "var(--text-muted)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      ฿{STARTER_PRICE_MONTHLY}
                    </span>
                  </div>
                  <ul className="pc-features">
                    {starterFeatures.map((line, i) => (
                      <li key={line} className={i < 5 ? "ok" : "no"}>
                        <FeatureIcon ok={i < 5} />
                        <span>{i === 0 ? <strong>{line}</strong> : line}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn-outline btn-ripple"
                    disabled={stripeBillingEnabled && pending}
                    aria-busy={stripeBillingEnabled && pending}
                    onClick={stripeBillingEnabled ? () => void startCheckout("starter") : undefined}
                  >
                    {t("starterCta")}
                  </button>
                </article>
              </div>
            </div>
          </section>

          <section className="section songkran" id="songkran">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("songkranHeading")}</h2>
                <p
                  style={{
                    marginTop: "var(--s3)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                  }}
                >
                  <span
                    className="partner-pill"
                    style={{ background: "var(--brand)", padding: "var(--s2) var(--s4)" }}
                  >
                    {t("songkranChip")}
                  </span>
                </p>
              </div>
              <div className="table-wrap reveal" style={{ marginBottom: "var(--s6)" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t("tablePurchase")}</th>
                      <th scope="col">{t("tablePartner")}</th>
                      <th scope="col">{t("tableSpend")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t("rowHotel")}</td>
                      <td>{t("partnerAgoda")}</td>
                      <td>฿3,000</td>
                    </tr>
                    <tr>
                      <td>{t("rowShop")}</td>
                      <td>{t("partnerShopee")}</td>
                      <td>฿1,500</td>
                    </tr>
                    <tr>
                      <td>{t("rowGrocery")}</td>
                      <td>{t("partnerLotus")}</td>
                      <td>฿800</td>
                    </tr>
                    <tr>
                      <th scope="row">{t("tableTotal")}</th>
                      <td />
                      <th>฿5,300</th>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="table-wrap reveal">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t("tableTier")}</th>
                      <th scope="col">{t("tableMult")}</th>
                      <th scope="col">{t("tableQuestBonus")}</th>
                      <th scope="col">{t("tableTotalPts")}</th>
                      <th scope="col">{t("tableValue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Free</td>
                      <td>1×</td>
                      <td>+150 pts</td>
                      <td>5,450 pts</td>
                      <td>฿54.50</td>
                    </tr>
                    <tr>
                      <td>Starter</td>
                      <td>1.5×</td>
                      <td>+150 pts</td>
                      <td>8,100 pts</td>
                      <td>฿81.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="leaving-line reveal" style={{ marginTop: "var(--s8)" }}>
                {t("songkranCallout")}
              </p>
              <div className="promo-bar">{t("songkranUrgency", { countdown: countdownText })}</div>
              <div style={{ textAlign: "center", marginTop: "var(--s8)" }}>
                {stripeBillingEnabled ? (
                  <button
                    type="button"
                    className="btn-primary btn-ripple"
                    disabled={pending}
                    aria-busy={pending}
                    onClick={() => void startCheckout("starter")}
                  >
                    {t("songkranUpgradeCta")}
                  </button>
                ) : (
                  <a className="btn-primary btn-ripple" href="#pricing">
                    {t("songkranUpgradeCta")}
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="section section-gameboard" id="gameboard">
            <div className="container">
              <div className="section-head gameboard-section-head">
                <h2 className="section-title">{t("gameboardHeading")}</h2>
                <p className="gameboard-intro">{t("gameboardIntro")}</p>
              </div>
            </div>
            <div className="gameboard-card">
              <div className="gameboard-panels">
                <div className="gameboard-panel gameboard-panel--streak">
                  <div className="gameboard-panel-head">
                    <div className="gameboard-panel-head-main">
                      <h3 className="gameboard-panel-title">{t("streakLabel")}</h3>
                      <p className="gameboard-panel-hint">{t("streakHelp")}</p>
                    </div>
                    <button type="button" id="streak-reset" className="gameboard-reset">
                      <RotateCcw
                        className="gameboard-reset-icon"
                        width={18}
                        height={18}
                        aria-hidden
                      />
                      <span>{t("streakReset")}</span>
                    </button>
                  </div>
                  <p className="gameboard-field-label" id="streak-plan-label">
                    {t("streakPlanHelp")}
                  </p>
                  <div
                    className="streak-plan-segment"
                    role="radiogroup"
                    aria-labelledby="streak-plan-label"
                  >
                    <label className="streak-plan-option">
                      <input type="radio" name="mship-streak-plan" value="plus" defaultChecked />
                      <span className="streak-plan-option-ui">{t("streakPlus")}</span>
                    </label>
                    <label className="streak-plan-option">
                      <input type="radio" name="mship-streak-plan" value="pro" />
                      <span className="streak-plan-option-ui">{t("streakPro")}</span>
                    </label>
                  </div>
                  <p className="gameboard-field-label" id="streak-grid-label">
                    {t("streakGridHelp")}
                  </p>
                  <div
                    className="streak-grid-surface"
                    role="group"
                    aria-label={t("streakGridAria")}
                    aria-describedby="streak-grid-label"
                  >
                    <div id="streak-grid" className="sg7" />
                  </div>
                  <p id="streak-total" className="gameboard-streak-total">
                    {t("streakZero")}
                  </p>
                </div>
                <div className="gameboard-panel gameboard-panel--quests">
                  <div className="gameboard-panel-head gameboard-panel-head--quests">
                    <div className="gameboard-panel-head-main">
                      <h3 className="gameboard-panel-title">{t("questSection")}</h3>
                      <p className="gameboard-panel-hint">{t("questHelp")}</p>
                    </div>
                  </div>
                  <ul className="quest-list" role="list" aria-label={t("questSection")}>
                    {questTasks.map((label) => (
                      <li key={label}>
                        <button type="button" className="quest-task reveal">
                          <span className="quest-task-check" aria-hidden />
                          <span className="quest-task-label">{label}</span>
                          <span className="quest-pts">{t("questPts")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="gameboard-progress-label" id="quest-progress-label">
                    {t("questProgressLabel")}
                  </p>
                  <p
                    id="quest-total"
                    className="gameboard-quest-total"
                    aria-labelledby="quest-progress-label"
                  >
                    {t("questFmt", { done: "0", pts: "0" })}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="social-proof">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("socialHeading")}</h2>
              </div>
            </div>
            <div className="leaderboard" style={{ marginBottom: "var(--s10)" }}>
              <div className="lb-row">
                <span className="lb-rank rank-gold">🥇</span>
                <span className="lb-name">{t("lbUser1")}</span>
                <span className="lb-pts">150,209 pts</span>
                <span className="tier-badge tb-pro">{t("badgePro")}</span>
              </div>
              <div className="lb-row">
                <span className="lb-rank rank-gold">🥈</span>
                <span className="lb-name">{t("lbUser2")}</span>
                <span className="lb-pts">102,450 pts</span>
                <span className="tier-badge tb-pro">{t("badgePro")}</span>
              </div>
              <div className="lb-row">
                <span className="lb-rank rank-gold">🥉</span>
                <span className="lb-name">{t("lbUser3")}</span>
                <span className="lb-pts">100,016 pts</span>
                <span className="tier-badge tb-plus">{t("badgePlus")}</span>
              </div>
            </div>
            <div className="stats-row">
              <div className="stat-card reveal">
                <span data-count-to="95" data-suffix="%">
                  0%
                </span>
                <p>{t("stat1")}</p>
              </div>
              <div className="stat-card reveal">
                <span data-count-to="3.2" data-suffix="×">
                  0×
                </span>
                <p>{t("stat2")}</p>
              </div>
              <div className="stat-card reveal">
                <span>
                  ฿<span data-count-to="107">0</span>
                </span>
                <p>{t("stat3")}</p>
              </div>
            </div>
          </section>

          <section className="section" id="faq">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("faqHeading")}</h2>
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
