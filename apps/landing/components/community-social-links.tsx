import AnimateOnScroll from "@/components/animate-on-scroll";
import SocialIcon from "@/components/social-icon";
import { SOCIAL_ICONS } from "@/components/social-data";
import {
  twFocusRingPrimary,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";

const linkClass =
  `inline-flex items-center justify-center gap-2 rounded-full font-medium ` +
  `min-h-[3.35rem] min-w-[3.35rem] border border-primary/15 ` +
  `bg-gradient-to-b from-white to-mint/30 text-gray-800 ` +
  `shadow-[0_10px_28px_-12px_rgba(22,163,74,0.22),0_4px_12px_-4px_rgba(15,23,42,0.08)] ` +
  `ring-1 ring-black/[0.05] ` +
  `transition-[box-shadow,transform,border-color,color] duration-200 ease-out ` +
  `hover:border-primary/40 hover:text-primary ` +
  `hover:shadow-[0_14px_32px_-12px_rgba(22,163,74,0.3),0_6px_16px_-4px_rgba(15,23,42,0.1)] ` +
  `max-sm:hover:-translate-y-0.5 max-sm:active:translate-y-0 max-sm:active:scale-[0.97] ` +
  `sm:min-h-11 sm:min-w-11 sm:border-gray-200 sm:bg-white sm:px-4 sm:py-2 sm:text-sm ` +
  `sm:shadow-sm sm:ring-0 sm:hover:translate-y-0 sm:hover:shadow-sm sm:active:scale-100 ` +
  `${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`;

/**
 * Social icon grid for the Community section — elevated mobile tile row, classic chips from `sm` up.
 */
export default function CommunitySocialLinks() {
  return (
    <div className="mx-auto mt-10 w-full max-w-[22rem] sm:max-w-none">
      <div className="rounded-[1.75rem] border border-primary/12 bg-gradient-to-b from-white via-white to-mint/20 p-5 shadow-lg shadow-primary/[0.07] ring-1 ring-black/[0.04] sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
        <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
          {SOCIAL_ICONS.map((social, i) => (
            <AnimateOnScroll
              key={social.label}
              delay={i * 60}
              className="flex w-full justify-center sm:w-auto"
            >
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className={linkClass}
              >
                <SocialIcon name={social.icon} size="prominent" />
                <span className="hidden sm:inline">{social.label}</span>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </div>
  );
}
