export function buildCheckoutRedirectUrls(orderId: string) {
  const origin =
    process.env.CUSTOMER_APP_URL ||
    process.env.ADMIN_APP_URL ||
    'https://gogocash.co';

  return {
    successUrl: `${origin}/commerce/checkout/success?order=${orderId}`,
    cancelUrl: `${origin}/commerce/checkout/cancel?order=${orderId}`,
  };
}
