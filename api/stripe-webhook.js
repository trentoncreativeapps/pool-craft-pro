import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Signature verification needs the exact raw request bytes - disable Vercel's
// default JSON body parsing so we can read the untouched buffer ourselves.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error("stripe-webhook: missing STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET/VITE_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Server not configured" });
  }

  const stripe = new Stripe(stripeSecret);
  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"], webhookSecret);
  } catch (err) {
    console.error("stripe-webhook: signature verification failed", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Admin client - bypasses RLS to update another user's account. Never expose
  // SUPABASE_SERVICE_ROLE_KEY to the client; it belongs only in this function.
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const setPlan = async (userId, plan, extra = {}) => {
    if (!userId) { console.error("stripe-webhook: event missing supabase_user_id metadata"); return; }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { plan, ...extra },
    });
    if (error) console.error("stripe-webhook: failed to update user", userId, error.message);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") {
          await setPlan(session.metadata?.supabase_user_id, session.metadata?.plan || null, {
            stripe_customer_id: session.customer,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        const plan = sub.metadata?.plan;
        const active = sub.status === "active" || sub.status === "trialing";
        await setPlan(userId, active ? (plan || null) : null, { stripe_customer_id: sub.customer });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await setPlan(sub.metadata?.supabase_user_id, null, { stripe_customer_id: sub.customer });
        break;
      }
      default:
        break; // ignore events we don't act on
    }
  } catch (err) {
    console.error("stripe-webhook: handler error", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.status(200).json({ received: true });
}
