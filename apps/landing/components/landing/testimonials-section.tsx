import Image from "next/image";
import SectionBadge from "@/components/section-badge";
import AnimateOnScroll from "@/components/animate-on-scroll";
import { uiSectionTitle } from "@/lib/ui-classes";

const TESTIMONIALS = [
  {
    quote:
      "I use GoGoCash for Shopee and Lazada every month. The cashback adds up fast and withdrawals are straightforward.",
    name: "Siriporn K.",
    role: "Bangkok",
    imageSrc: "/images/user-siriporn.svg",
  },
  {
    quote:
      "Finally a cashback app that works across travel and electronics. Agoda and Samsung deals paid for themselves.",
    name: "Ahmad R.",
    role: "Kuala Lumpur",
    imageSrc: "/images/user-ahmad.svg",
  },
  {
    quote:
      "Tracking is clear and support helped when one order was delayed. Still my go-to before any big purchase.",
    name: "Nguyen T.",
    role: "Ho Chi Minh City",
    imageSrc: "/images/user-nguyen.svg",
  },
] as const;

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="scroll-mt-28 border-t border-gray-100 bg-gray-50/80 py-16 md:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="mx-auto max-w-2xl text-center">
            <SectionBadge label="Community" />
            <h2
              id="testimonials-heading"
              className={`mt-6 ${uiSectionTitle}`}
            >
              What shoppers say about GoGoCash
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Real stories from people earning cashback across Southeast Asia.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <AnimateOnScroll key={t.name} delay={i * 80}>
              <figure className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <blockquote className="flex-1 text-sm leading-relaxed text-gray-700">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                  <Image
                    src={t.imageSrc}
                    alt={`${t.name} profile`}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
