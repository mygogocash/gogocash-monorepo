async function convertToUSD(
  currency: string,
  amount: number,
): Promise<{ usdAmount: number | null; exchangeRate: number | null }> {
  if (currency === 'USD') {
    return { usdAmount: amount, exchangeRate: 1 };
  }

  try {
    // Using a free currency conversion API (you can replace with your preferred service)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${currency}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate for ${currency}`);
    }

    const data = await response.json();
    const exchangeRate = data.rates.USD;

    if (!exchangeRate) {
      throw new Error(`USD exchange rate not found for ${currency}`);
    }

    return { usdAmount: amount * exchangeRate, exchangeRate };
  } catch (error) {
    console.error(`Error converting ${currency} to USD:`, error);
    return { usdAmount: null, exchangeRate: null };
  }
}
export { convertToUSD };
