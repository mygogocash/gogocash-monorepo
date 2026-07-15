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
  const normalizedName = draft.trim();
  if (!normalizedName) {
    return { normalizedName, error: "Enter a category name." };
  }

  const duplicate = categories.some(
    (category) =>
      category._id !== currentCategoryId &&
      category.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );
  return {
    normalizedName,
    error: duplicate
      ? `A category named "${normalizedName}" already exists.`
      : null,
  };
}
