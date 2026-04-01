"use client";

import "./membership.css";

import Image from "next/image";
import { Check, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef } from "react";

import { useMembershipLanding, type MembershipLandingI18n } from "./useMembershipLanding";
import { useStripeCheckout } from "./useStripeCheckout";

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

  const { startCheckout, openBillingPortal, pending, portalPending, stripeBillingEnabled } =
    useStripeCheckout(rootRef, checkoutMessages);

  const freeFeatures = t.raw("freeFeatures") as string[];
  const starterFeatures = t.raw("starterFeatures") as string[];
  const plusFeatures = t.raw("plusFeatures") as string[];
  const proFeatures = t.raw("proFeatures") as string[];
  const questTasks = t.raw("questTasks") as string[];
  const faqItems = t.raw("faq") as { q: string; a: string }[];

  return (
    <div
      ref={rootRef}
      className="membership-root font-sans antialiased"
      data-theme={theme}
      suppressHydrationWarning
    >
      <div className="mship-layout">
        <header className="mship-sticky-head">
          <div className="mship-toolbar" id="top">
            <div className="mship-toolbar-inner">
              <p className="mship-toolbar-title">{t("toolbarTitle")}</p>
              <div className="mship-toolbar-actions">
                {stripeBillingEnabled ? (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-[var(--gc-border,#e4e4e4)] bg-white px-3 py-2 text-sm font-semibold text-[#00aa80] hover:bg-[#f6f6f6] disabled:opacity-50"
                      disabled={portalPending}
                      onClick={() => void openBillingPortal()}
                    >
                      {t("stripeManageBilling")}
                    </button>
                    <button
                      type="button"
                      className="pill-cta btn-ripple"
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() => void startCheckout("plus")}
                    >
                      {t("getPlus")}
                    </button>
                  </>
                ) : (
                  <a className="pill-cta btn-ripple" href="#pricing">
                    {t("getPlus")}
                  </a>
                )}
              </div>
            </div>
          </div>

          <nav className="mship-page-nav" aria-label={t("pageNavLabel")}>
            <span className="sr-only">{t("pageNavHint")}</span>
            <a className="mship-nav-pill" href="#calculator">
              {t("navCalculator")}
            </a>
            <a className="mship-nav-pill" href="#pricing">
              {t("navPlans")}
            </a>
            <a className="mship-nav-pill" href="#songkran">
              {t("navCompare")}
            </a>
            <a className="mship-nav-pill" href="#faq">
              {t("navFaq")}
            </a>
            <a className="mship-nav-pill mship-nav-pill--accent" href="#footer-cta">
              {t("navCta")}
            </a>
          </nav>
        </header>

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
              <div className="hero-cards-wrap">
                <div className="hero-cards">
                  <div className="hero-card hero-card-free">
                    <h3>{t("tierFree")}</h3>
                    <div className="mult-badge mb-free">1×</div>
                    <div className="hero-pts">
                      <span id="hero-pts-free" data-suffix={t("ptsSuffix")}>
                        0
                      </span>
                    </div>
                  </div>
                  <div className="hero-card hero-card-plus">
                    <h3>{t("tierPlus")}</h3>
                    <div className="mult-badge mb-plus badge-pulse">2×</div>
                    <div className="hero-pts">
                      <span id="hero-pts-plus" data-suffix={t("ptsSuffix")}>
                        0
                      </span>
                    </div>
                  </div>
                  <div className="hero-card hero-card-pro">
                    <h3>{t("tierPro")}</h3>
                    <div className="mult-badge mb-pro">3×</div>
                    <div className="hero-pts">
                      <span id="hero-pts-pro" data-suffix={t("ptsSuffix")}>
                        0
                      </span>
                    </div>
                    <div id="hero-pro-bonus" className="pts-popup" aria-hidden="true">
                      {t("bonusPopup")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="calculator">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("calcHeading")}</h2>
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
                  <div className="calc-col">
                    <div className="calc-tier">{t("calcPlus")}</div>
                    <div id="pts-plus" className="calc-pts" />
                    <div id="extra-plus" className="calc-extra" />
                  </div>
                  <div className="calc-col calc-col-pro">
                    <div className="calc-tier">{t("calcPro")}</div>
                    <div id="pts-pro" className="calc-pts" />
                    <div id="extra-pro" className="calc-extra" />
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
            </div>
          </section>

          <section className="section" id="pricing">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("pickHeading")}</h2>
              </div>
              <div
                id="billing-toggle"
                data-annual="false"
                role="group"
                aria-label={t("billingAria")}
              >
                <button type="button" id="bill-monthly" className="active" data-billing="monthly">
                  {t("monthly")}
                </button>
                <button type="button" id="bill-annual" data-billing="annual">
                  {t("annual")} <span className="billing-save">{t("annualSave")}</span>
                </button>
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
                    <span id="price-starter">฿69/mo</span>{" "}
                    <span
                      id="price-orig-starter"
                      className="orig"
                      style={{
                        display: "none",
                        textDecoration: "line-through",
                        color: "var(--text-muted)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      ฿69
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
                <article className="pricing-card pricing-card-featured">
                  <div className="popular-badge">{t("popular")}</div>
                  <div className="pc-head">
                    <span className="mult-badge mb-plus badge-pulse">2×</span>
                  </div>
                  <div className="pc-price">
                    <span id="price-plus">฿149/mo</span>{" "}
                    <span
                      id="price-orig-plus"
                      style={{
                        display: "none",
                        textDecoration: "line-through",
                        color: "var(--text-muted)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      ฿149
                    </span>
                  </div>
                  <ul className="pc-features">
                    {plusFeatures.map((line, i) => (
                      <li key={line} className="ok">
                        <span className="feat-icon">
                          <Check width={18} height={18} aria-hidden />
                        </span>
                        <span>
                          {i === 0 || i === 3 || i === 4 ? <strong>{line}</strong> : line}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn-solid btn-ripple"
                    disabled={stripeBillingEnabled && pending}
                    aria-busy={stripeBillingEnabled && pending}
                    onClick={stripeBillingEnabled ? () => void startCheckout("plus") : undefined}
                  >
                    {t("plusCta")}
                  </button>
                </article>
                <article className="pricing-card pro-card-bg">
                  <div className="pc-head">
                    <span className="mult-badge mb-pro">3×</span>
                  </div>
                  <div className="pc-price">
                    <span id="price-pro">฿299/mo</span>{" "}
                    <span
                      id="price-orig-pro"
                      style={{
                        display: "none",
                        textDecoration: "line-through",
                        color: "var(--text-muted)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      ฿299
                    </span>
                  </div>
                  <ul className="pc-features">
                    {proFeatures.map((line, i) => (
                      <li key={line} className="ok">
                        <span className="feat-icon" style={{ color: "var(--gold)" }}>
                          <Check width={18} height={18} aria-hidden />
                        </span>
                        <span>{[0, 3, 4, 5].includes(i) ? <strong>{line}</strong> : line}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn-pro-dark btn-ripple"
                    disabled={stripeBillingEnabled && pending}
                    aria-busy={stripeBillingEnabled && pending}
                    onClick={stripeBillingEnabled ? () => void startCheckout("pro") : undefined}
                  >
                    {t("proCta")}
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
                    <tr>
                      <td>Plus</td>
                      <td>2×</td>
                      <td>+150 pts</td>
                      <td>10,750 pts</td>
                      <td>฿107.50</td>
                    </tr>
                    <tr className="row-pro">
                      <td>Pro</td>
                      <td>3×</td>
                      <td>+150 pts</td>
                      <td>
                        16,050 pts <span className="best-val">{t("bestValue")}</span>
                      </td>
                      <td>฿160.50</td>
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
                    onClick={() => void startCheckout("plus")}
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

          <section className="section" id="gameboard">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("gameboardHeading")}</h2>
              </div>
              <div className="game-grid">
                <div className="streak-panel">
                  <div className="streak-toggle">
                    <label
                      htmlFor="streak-plan"
                      className="calc-label"
                      style={{ margin: 0, alignSelf: "center" }}
                    >
                      {t("streakLabel")}
                    </label>
                    <select id="streak-plan" aria-label={t("streakAria")}>
                      <option value="plus">{t("streakPlus")}</option>
                      <option value="pro">{t("streakPro")}</option>
                    </select>
                    <button
                      type="button"
                      id="streak-reset"
                      className="link-bounce"
                      style={{ marginLeft: "auto", fontSize: "var(--text-sm)" }}
                    >
                      {t("streakReset")}
                    </button>
                  </div>
                  <div id="streak-grid" className="sg7" />
                  <p id="streak-total" className="streak-total">
                    {t("streakZero")}
                  </p>
                </div>
                <div>
                  <p className="calc-label" style={{ marginBottom: "var(--s4)" }}>
                    {t("questSection")}
                  </p>
                  <div className="quest-stack">
                    {questTasks.map((label) => (
                      <button key={label} type="button" className="quest-task reveal">
                        <span>{label}</span>
                        <span className="quest-pts">{t("questPts")}</span>
                      </button>
                    ))}
                  </div>
                  <p id="quest-total" className="streak-total" style={{ marginTop: "var(--s4)" }}>
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
            </div>
          </section>

          <section className="section" id="faq">
            <div className="container">
              <div className="section-head">
                <h2 className="section-title">{t("faqHeading")}</h2>
              </div>
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

          <footer className="footer-cta" id="footer-cta">
            <div className="container">
              <h2>{t("footerH2")}</h2>
              <p>{t("footerBody")}</p>
              <p className="urgent">{t("footerUrgent")}</p>
              <div className="footer-btns">
                {stripeBillingEnabled ? (
                  <button
                    type="button"
                    className="btn-foot-primary btn-ripple"
                    disabled={pending}
                    aria-busy={pending}
                    onClick={() => void startCheckout("plus")}
                  >
                    {t("footerCta1")}
                  </button>
                ) : (
                  <button type="button" className="btn-foot-primary btn-ripple" id="cta-confetti">
                    {t("footerCta1")}
                  </button>
                )}
                <a className="btn-foot-secondary btn-ripple" href="#pricing">
                  {t("footerCta2")}
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
