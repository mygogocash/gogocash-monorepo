import type { PartnerBrand } from "@/lib/involve-asia";

export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let output = template;
  for (const [key, value] of Object.entries(vars)) {
    output = output.split(`{${key}}`).join(String(value));
  }
  return output;
}

export function filterPartnerBrands(
  partners: PartnerBrand[],
  query: string,
): PartnerBrand[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return partners;

  return partners.filter((partner) => {
    const name = partner.name.toLowerCase();
    const category = partner.category.toLowerCase();
    return (
      name.includes(normalizedQuery) || category.includes(normalizedQuery)
    );
  });
}

export function buildPartnerCountLine({
  query,
  total,
  filteredCount,
  brandsCountAll,
  brandsCountFiltered,
}: {
  query: string;
  total: number;
  filteredCount: number;
  brandsCountAll: string;
  brandsCountFiltered: string;
}): string {
  const isFiltered = query.trim().length > 0;
  return fillTemplate(
    isFiltered ? brandsCountFiltered : brandsCountAll,
    isFiltered ? { filtered: filteredCount, total } : { count: total },
  );
}
