import type { CategoryIconKey } from "@/components/policy/CategoryIcon";

type PolicyAggregateInput = {
  categoryId?: string;
  categoryName: string;
  iconKey: CategoryIconKey;
  policy: Record<string, unknown>;
  defaultBanner: File | null;
};

export function normalizePolicyCategoryName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/** Stable client signature used only to decide whether a failed retry may reuse its key. */
export async function policyAggregateSignature(
  input: PolicyAggregateInput,
): Promise<string> {
  const fileHash = input.defaultBanner
    ? Array.from(
        new Uint8Array(
          await globalThis.crypto.subtle.digest(
            "SHA-256",
            await input.defaultBanner.arrayBuffer(),
          ),
        ),
      )
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
    : null;
  return JSON.stringify({
    categoryId: input.categoryId ?? null,
    categoryName: normalizePolicyCategoryName(input.categoryName),
    iconKey: input.iconKey,
    policy: input.policy,
    defaultBanner: input.defaultBanner
      ? {
          name: input.defaultBanner.name,
          size: input.defaultBanner.size,
          type: input.defaultBanner.type,
          lastModified: input.defaultBanner.lastModified,
          sha256: fileHash,
        }
      : null,
  });
}

export function buildPolicyAggregateFormData(
  input: PolicyAggregateInput & { requestKey: string },
): FormData {
  const form = new FormData();
  form.set("request_key", input.requestKey);
  if (input.categoryId) form.set("category_id", input.categoryId);
  form.set("category_name", normalizePolicyCategoryName(input.categoryName));
  form.set("icon_key", input.iconKey);
  form.set("policy", JSON.stringify(input.policy));
  if (input.defaultBanner) {
    form.set("default_banner", input.defaultBanner);
  }
  return form;
}

export function newPolicyRequestKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `policy-save-${uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}
