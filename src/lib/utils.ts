import { TypeCommissions } from "@/interfaces/offer";
import { ResRate } from "@/interfaces/rate";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getApiBaseUrl, shouldUseMockApi } from "./env";

export { dmSans } from "./fonts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatAddress = (address: string, digitBefore = 6, digitAfter = 4) => {
  if (address.length <= 10) return address;
  return `${address.slice(0, digitBefore)}...${address.slice(-digitAfter)}`;
};

export const formatNumber = (num: number, decimal = 2) => {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  });
};

/**
 * Cash / balance display: grouped thousands, up to `maxDecimals` fractional digits.
 * Whole numbers omit ".00" (e.g. 3180 → "3,180"; 3180.24 → "3,180.24").
 */
export function formatCashDisplay(num: number, maxDecimals = 2): string {
  const n = Number.isFinite(num) ? num : 0;
  const rounded = Number.parseFloat(n.toFixed(maxDecimals));
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

const resolveAssetPath = (path?: string) => {
  if (!path) {
    return "";
  }

  if (path.startsWith("/") || /^https?:\/\//.test(path)) {
    return path;
  }

  /** In mock mode, never prefix API host for relative asset keys (avoids 404s when URL points at prod). */
  const apiBaseUrl = shouldUseMockApi() ? "" : getApiBaseUrl();

  if (!apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}/google-drive/file/${path}`;
};

export const logoOffer = (logo: string, logo_desktop: string, logo_mobile: string, lg: boolean) => {
  return resolveAssetPath(lg ? logo_desktop || logo : logo_mobile || logo);
};

export const currentCountry = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const checkThai = currentCountry() === "Asia/Bangkok" ? true : false;

export const banner = (mobile: string, desktop: string, lg: boolean) => {
  return resolveAssetPath(lg ? desktop : mobile);
};

export const pathImage = (path: string) => {
  return resolveAssetPath(path);
};
export async function convertToTHB(
  currency: string,
  amount: number
): Promise<{ amount: number | null; exchangeRate: number | null }> {
  if (currency === "USD") {
    return { amount: amount, exchangeRate: 1 };
  }

  try {
    // Using a free currency conversion API (you can replace with your preferred service)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate for ${currency}`);
    }

    const data = await response.json();
    const exchangeRate = data.rates.THB;

    if (!exchangeRate) {
      throw new Error(`USD exchange rate not found for ${currency}`);
    }

    return { amount: amount * exchangeRate, exchangeRate };
  } catch {
    return { amount: null, exchangeRate: null };
  }
}

export const rateCurrency = async (currencyCode: string): Promise<ResRate> => {
  const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currencyCode}`);
  return response.json()?.then((data) => data.rates);
};

export const getPercent = (commissions: TypeCommissions[] | undefined, returnString?: boolean) => {
  if (!commissions?.length) {
    return returnString ? "0.0%" : "0.0";
  }

  const list = Object.values(commissions).filter((item) => {
    const first = Object.values(item)[0];
    return first !== undefined && Number(first.slice(0, 1)) > 0;
  });

  const firstRow = list[0];
  const percent = firstRow !== undefined ? Object.values(firstRow)[0] : undefined;
  const percentStr = percent ?? "0%";
  if (returnString) {
    return parseFloat(percentStr).toFixed(1) + "%";
  }
  return parseFloat(percentStr).toFixed(1);
};
