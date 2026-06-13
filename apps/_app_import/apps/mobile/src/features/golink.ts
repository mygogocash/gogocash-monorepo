const supportedProtocols = new Set(["http:", "https:"]);

function parseGoLinkUrl(value: string): URL | null {
  const trimmedValue = value.trim();

  if (!trimmedValue || /\s/.test(trimmedValue)) {
    return null;
  }

  for (const candidate of [trimmedValue, `https://${trimmedValue}`]) {
    try {
      const parsedUrl = new URL(candidate);

      if (supportedProtocols.has(parsedUrl.protocol) && parsedUrl.hostname.includes(".")) {
        return parsedUrl;
      }
    } catch {
      // Keep trying the normalized candidate before deciding the pasted value is invalid.
    }
  }

  return null;
}

export function isValidGoLinkUrl(value: string): boolean {
  return parseGoLinkUrl(value) !== null;
}

export function getGoLinkSourceHost(value: string): string {
  return parseGoLinkUrl(value)?.hostname.replace(/^www\./i, "") ?? "";
}
