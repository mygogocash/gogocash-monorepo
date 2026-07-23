type CategoryNameRecord = { _id: string; name: string };

export type CategoryNameValidation = {
  normalizedName: string;
  error: string | null;
};

export function validateCategoryName(
  draft: string,
  categories: CategoryNameRecord[],
  currentCategoryId?: string,
): CategoryNameValidation {
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const normalizedName = normalize(draft);
  if (!normalizedName) {
    return { normalizedName, error: "Enter a category name." };
  }

  const duplicate = categories.some(
    (category) =>
      category._id !== currentCategoryId &&
      normalize(category.name).toLocaleLowerCase("en-US") ===
        normalizedName.toLocaleLowerCase("en-US"),
  );
  return {
    normalizedName,
    error: duplicate
      ? `A category named "${normalizedName}" already exists.`
      : null,
  };
}
