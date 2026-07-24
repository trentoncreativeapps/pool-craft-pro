import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Billing isn't configured yet - check back soon." });
  }

  const { customerId } = req.body || {};
  if (!customerId || typeof customerId !== "string") {
    return res.status(400).json({ error: "customerId required" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : "");

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?tab=settings`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not open billing portal" });
  }
}
