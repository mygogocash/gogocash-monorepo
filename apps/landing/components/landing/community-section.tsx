import SectionBadge from "@/components/section-badge";
import AnimateOnScroll from "@/components/animate-on-scroll";
import CommunitySocialLinks from "@/components/community-social-links";
import { uiSectionTitle } from "@/lib/ui-classes";

export default function CommunitySection() {
  return (
    <section id="community" className="scroll-mt-28 py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge label="Community" />
            <h2 className={`mt-6 ${uiSectionTitle}`}>
              Join the GoGoCash community
            </h2>
            <p className="mt-4 max-w-xl text-base text-gray-500">
              Tips, drops, and support from the team and other savers — pick
              your channel.
            </p>
          </div>
        </AnimateOnScroll>

        <CommunitySocialLinks />
      </div>
    </section>
  );
}
