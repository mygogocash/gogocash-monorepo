import SectionBadge from "@/components/section-badge";
import AnimateOnScroll from "@/components/animate-on-scroll";
import { ArrowUpRight } from "@/components/icons";
import {
  twDurButton,
  twEaseStandard,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import {
  uiCardTitle,
  uiLinkCta,
  uiSectionTitleCompact,
} from "@/lib/ui-classes";

const TEASERS = [
  {
    title: "How cashback tracking works",
    desc: "From click to confirmation — what happens behind the scenes.",
    href: "/learn/how-cashback-works",
  },
  {
    title: "Withdraw cashback to bank or e-wallet",
    desc: "Minimums, timing, and what “confirmed” balance means.",
    href: "/learn/withdraw-cashback-gogocash",
  },
  {
    title: "Cashback not tracking?",
    desc: "A short checklist before you contact support.",
    href: "/learn/cashback-not-tracking-fixes",
  },
];

export default function ContentTeaser() {
  return (
    <section id="learn" className="scroll-mt-28 border-t border-gray-100 bg-white py-16 md:py-20">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge label="Learn" />
            <h2 className={`mt-6 ${uiSectionTitleCompact}`}>
              Smarter saving, explained simply
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TEASERS.map((item, i) => (
            <AnimateOnScroll key={item.title} delay={i * 100}>
              <a
                href={item.href}
                className={`group flex h-full flex-col rounded-2xl border border-gray-100 bg-cream/50 p-6 hover:border-primary/20 hover:shadow-md ${twTransitionButton} ${twPressSm}`}
              >
                <h3 className={uiCardTitle}>
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-gray-500">{item.desc}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-sm ${uiLinkCta}`}>
                  Read more
                  <ArrowUpRight className={`h-4 w-4 transition-transform ${twDurButton} ${twEaseStandard} motion-reduce:transition-none group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
                </span>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
