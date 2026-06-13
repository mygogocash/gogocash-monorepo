"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { logFaqOpen } from "@/lib/analytics-client";
import {
  twDurSection,
  twEaseStandard,
  twFocusRingPrimary,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={`overflow-hidden rounded-2xl border border-primary/20 bg-white ${twDurSection} ${twEaseStandard} transition-[box-shadow] motion-reduce:duration-micro`}
          >
            <button
              type="button"
              onClick={() => {
                if (!isOpen) logFaqOpen(item.question);
                setOpenIndex(isOpen ? null : index);
              }}
              className={`flex min-h-11 w-full items-center justify-between gap-4 px-6 py-5 text-left ${twTransitionButton} ${twPressSm} rounded-2xl ${twFocusRingPrimary}`}
              aria-expanded={isOpen}
            >
              <span className="min-w-0 flex-1 text-[15px] font-medium text-[#171717]">
                {item.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#a3a3a3] transition-transform duration-section ease-standard motion-reduce:duration-micro ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-section ease-standard motion-reduce:duration-micro ${
                isOpen ? "max-h-[min(100vh,56rem)] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-5 text-sm leading-relaxed text-[#737373]">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
