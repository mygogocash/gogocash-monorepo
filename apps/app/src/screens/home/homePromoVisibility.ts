type HomePromoSection = {
  readonly id: string;
};

type HomePromoSurface = {
  readonly currentHostname?: string;
  readonly frontendUrl: string;
};

const productionCustomerHostnames = new Set([
  "app.gogocash.co",
  "beta.gogocash.co",
]);

const hiddenProductionPromoSectionIds = new Set(["makeup", "travel"]);

function normalizeHostname(value: string | undefined): string {
  return value?.trim().toLowerCase().replace(/\.$/, "") ?? "";
}

function getConfiguredHostname(frontendUrl: string): string {
  try {
    return normalizeHostname(new URL(frontendUrl).hostname);
  } catch {
    return "";
  }
}

export function filterHomePromoSectionsForSurface<
  TSection extends HomePromoSection,
>(
  sections: readonly TSection[],
  surface: HomePromoSurface,
): readonly TSection[] {
  const hostname =
    normalizeHostname(surface.currentHostname) ||
    getConfiguredHostname(surface.frontendUrl);

  if (!productionCustomerHostnames.has(hostname)) {
    return sections;
  }

  return sections.filter(
    (section) => !hiddenProductionPromoSectionIds.has(section.id),
  );
}
