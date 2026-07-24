import Stripe from "stripe";
import { PLANS, planAmount } from "./_plans.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Billing isn't configured yet - check back soon." });
  }

  const { plan, interval, userId, email, customerId } = req.body || {};
  if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });
  if (interval !== "month" && interval !== "year") return res.status(400).json({ error: "Invalid interval" });
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "You must be signed in to subscribe" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const amount = planAmount(plan, interval);
  const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : "");

  try {
    // Prices are built inline per-checkout rather than pre-created in the Stripe
    // dashboard, so the Customer Portal can't offer an in-portal "switch plan"
    // option (it only knows fixed Price IDs). Guard against creating a second,
    // duplicate-billing subscription for someone who already has one - point
    // them at the portal to cancel first instead.
    if (customerId) {
      const existing = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (existing.data.length > 0) {
        return res.status(409).json({ error: "You already have an active subscription. Use Manage Billing to cancel it before starting a new plan." });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: userId,
      customer_email: email || undefined,
      metadata: { supabase_user_id: userId, plan },
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: amount,
          recurring: { interval },
          product_data: { name: `Pool Craft Pro - ${PLANS[plan].name} (${interval === "year" ? "Annual" : "Monthly"})` },
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: { supabase_user_id: userId, plan },
      },
      success_url: `${origin}/?checkout=success&plan=${plan}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not start checkout" });
  }
}
