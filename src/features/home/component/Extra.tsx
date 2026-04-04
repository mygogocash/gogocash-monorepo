import { useQuery } from "@tanstack/react-query";
import CardSlideCategory from "../common/CardSlideCategory";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { HOME_TOP_BRANDS_CAROUSEL_MAX, homeSectionMeta } from "../constants";
import { offerExtraQueryOptions } from "@/lib/queries/offerExtra";

function CustomNavSwiper() {
  const { data: offers } = useQuery({ ...offerExtraQueryOptions });

  const section = homeSectionMeta.topBrands;

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-6">
      <HomeSectionHeader variant="sectionRow" icon="🔥" title={section.title} link={section.link} />
      <CardSlideCategory
        cardVariant="featured"
        maxItems={HOME_TOP_BRANDS_CAROUSEL_MAX}
        list={offers}
        showPagination
        trackingListId={section.trackingListId}
        trackingListName={section.trackingListName}
      />
    </section>
  );
}

export default CustomNavSwiper;
