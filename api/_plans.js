// Shared plan/pricing definitions used by the checkout and webhook functions
// (and imported directly by the client Settings UI - see src/App.jsx - so the
// displayed price can never drift from what Stripe actually charges).
// Keep this as the single source of truth for prices - changing a number here
// changes what Stripe actually charges on the next checkout.
export const PLANS = {
  basic: {
    name: "Basic",
    dailyLimit: 10,
    month: 9900, // $99.00
    year: 99000, // $990.00
  },
  pro: {
    name: "Pro",
    dailyLimit: 25,
    month: 14900, // $149.00
    year: 149000, // $1,490.00
  },
  team: {
    name: "Team",
    dailyLimitPerSeat: 25, // each purchased seat adds this many renders/day to the one account's cap - see App.jsx's DAILY_RENDER_LIMIT
    month: 14900, // $149.00 per seat
    year: 149000, // $1,490.00 per seat
    minSeats: 2,
    maxSeats: 50,
  },
};

export function planAmount(plan, interval) {
  const p = PLANS[plan];
  if (!p) return null;
  return interval === "year" ? p.year : p.month;
}
