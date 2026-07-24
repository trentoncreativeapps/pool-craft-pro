// Shared plan/pricing definitions used by the checkout and webhook functions.
// Keep this as the single source of truth for prices - changing a number here
// changes what Stripe actually charges on the next checkout.
export const PLANS = {
  basic: {
    name: "Basic",
    dailyLimit: 10,
    month: 2999, // $29.99
    year: 29900, // $299.00
  },
  pro: {
    name: "Pro",
    dailyLimit: 25,
    month: 4999, // $49.99
    year: 49900, // $499.00
  },
};

export function planAmount(plan, interval) {
  const p = PLANS[plan];
  if (!p) return null;
  return interval === "year" ? p.year : p.month;
}
