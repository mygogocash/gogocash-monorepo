export type GoLinkProductPreview = {
  title: string | null;
  imageUrl: string | null;
  description: string | null;
  price: string | null;
};

const EMPTY_PREVIEW: GoLinkProductPreview = {
  title: null,
  imageUrl: null,
  description: null,
  price: null,
};

/**
 * Fetches Open Graph product fields for a pasted marketplace URL.
 * Degrades to empty fields on any failure — merchant card remains the fallback.
 */
export async function fetchGoLinkPreview({
  apiUrl,
  fetchImpl = fetch,
  url,
}: {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  url: string;
}): Promise<GoLinkProductPreview> {
  const trimmed = url.trim();
  if (!trimmed) {
    return EMPTY_PREVIEW;
  }

  try {
    const baseUrl = apiUrl.replace(/\/+$/, "");
    const response = await fetchImpl(`${baseUrl}/golink/preview`, {
      body: JSON.stringify({ url: trimmed }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return EMPTY_PREVIEW;
    }

    const payload = (await response.json().catch(() => null)) as
      | Partial<GoLinkProductPreview>
      | null;
    if (!payload || typeof payload !== "object") {
      return EMPTY_PREVIEW;
    }

    return {
      title: typeof payload.title === "string" ? payload.title : null,
      imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : null,
      description: typeof payload.description === "string" ? payload.description : null,
      price: typeof payload.price === "string" ? payload.price : null,
    };
  } catch {
    return EMPTY_PREVIEW;
  }
}

export function hasGoLinkProductPreview(preview: GoLinkProductPreview | null): boolean {
  if (!preview) {
    return false;
  }
  return Boolean(preview.title || preview.imageUrl || preview.price);
}
