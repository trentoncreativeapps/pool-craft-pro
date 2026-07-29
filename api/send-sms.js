// Server-side Twilio proxy for Build Tracker phase-update texts. Uses a plain
// fetch to Twilio's REST API directly (Basic Auth) rather than the twilio npm
// SDK, matching the rest of this app's api/*.js pattern of calling
// third-party REST APIs directly instead of pulling in a client library.
//
// Inert until a real Twilio account exists: without TWILIO_ACCOUNT_SID/
// TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER set in Vercel, this always returns a
// 503 - the same "not configured yet" pattern already used for Stripe/Mapbox
// elsewhere in this app, not a silent failure.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function isRateLimited(key) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { accountSid, authToken, fromNumber } = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
  };
  if (!accountSid || !authToken || !fromNumber) {
    return res.status(503).json({ error: "SMS updates aren't configured yet - add a Twilio account to enable this." });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many texts sent - please slow down" });
  }

  const { to, body } = req.body || {};
  if (!to || typeof to !== "string" || !/^\+?[0-9()\-.\s]{7,20}$/.test(to)) {
    return res.status(400).json({ error: "A valid destination phone number is required" });
  }
  if (!body || typeof body !== "string" || body.length > 1000) {
    return res.status(400).json({ error: "body required, must be a string under 1000 chars" });
  }

  const toDigits = to.replace(/[^0-9+]/g, "");
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toDigits, From: fromNumber, Body: body }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data?.message || "Twilio rejected the message" });
    }
    return res.status(200).json({ sid: data.sid, status: data.status });
  } catch (e) {
    return res.status(502).json({ error: e.message || "Could not reach Twilio" });
  }
}
