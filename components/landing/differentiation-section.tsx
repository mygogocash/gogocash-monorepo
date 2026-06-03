import AnimateOnScroll from "@/components/animate-on-scroll";
import SectionBadge from "@/components/section-badge";
import { CheckCircle2, Sparkles } from "@/components/icons";
import { SITE_FACTS } from "@/lib/site-facts";
import { uiSectionTitleLg } from "@/lib/ui-classes";

// Only verified differentiators (no crypto/"no minimum" claims — see issue #16).
const ROWS: { label: string; others: string }[] = [
  {
    label:
      "Real cashback you can withdraw to bank or e-wallet — not points that expire",
    others: "Often points",
  },
  {
    label:
      "Earn inside LINE and Telegram mini apps or on the web — no extra app to install",
    others: "App only",
  },
  {
    label: "Quests and seasonal boosts that stack on top of your base rate",
    others: "Rarely",
  },
  {
    label: `Rates shown before you shop at ${SITE_FACTS.partnerCountLabel} partners across ${SITE_FACTS.regionLabel}`,
    others: "Varies",
  },
];

/**
 * Differentiation / "why switch" section (#16). Benefit-led comparison against a
 * generic "other cashback apps" column (competitors not named). Claims are
 * limited to verified GoGoCash facts; the others column is hedged + disclaimed.
 */
export default function DifferentiationSection() {
  return (
    <section id="why-switch" className="scroll-mt-28 py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge
              icon={<Sparkles className="h-4 w-4" />}
              label="Why switch"
            />
            <h2 className={`mt-6 ${uiSectionTitleLg}`}>
              GoGoCash vs other cashback apps
            </h2>
            <p className="mt-4 max-w-2xl text-base text-gray-500">
              The same brands you already shop — a clearer, more flexible deal.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-x-3 border-b border-gray-100 bg-surface-green px-5 py-4 text-sm font-semibold sm:grid-cols-[1fr_7rem_7rem] sm:gap-x-6 sm:px-8">
              <span className="text-gray-700">What you get</span>
              <span className="text-center text-primary">GoGoCash</span>
              <span className="text-center text-gray-400">Others</span>
            </div>
            {ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-x-3 border-b border-gray-100 px-5 py-4 last:border-0 sm:grid-cols-[1fr_7rem_7rem] sm:gap-x-6 sm:px-8"
              >
                <span className="text-sm leading-relaxed text-gray-600">
                  {row.label}
                </span>
                <span className="flex justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="sr-only">Included with GoGoCash</span>
                </span>
                <span className="text-center text-xs text-gray-400">
                  {row.others}
                </span>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-gray-400">
          Compared with typical cashback and rewards apps; features vary by
          provider.
        </p>
      </div>
    </section>
  );
}
