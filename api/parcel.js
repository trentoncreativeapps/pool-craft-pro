// Server-side proxy for Realie parcel/property lookups. Realie's API key is a
// metered, billed credential and must never be exposed in a browser network
// request (same reasoning as the Regrid integration this replaces - Realie
// was chosen instead because it's dramatically cheaper for nationwide
// coverage: self-serve tiers start at $0/mo and $50/mo vs. Regrid's $375/mo
// minimum for the same nationwide access, and Realie's schema explicitly
// includes real parcel polygon geometry, not just attributes). Single shared
// REALIE_API_KEY set in Vercel covers every customer automatically - same
// pattern as Mapbox/fal.ai/Anthropic/Twilio.
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

// Realie's Address Lookup endpoint wants state + street as separate fields,
// but the app only has a single free-form geocoded address string - parse
// the trailing ", CITY, ST ZIP" pattern out of it. City is deliberately not
// forwarded even when parsed, since Realie requires "county" whenever "city"
// is provided and the app doesn't reliably have county data.
function parseUSAddress(full) {
  const parts = full.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const street = parts[0];
  const last = parts[parts.length - 1];
  const stateMatch = last.match(/^([A-Za-z]{2})\b/);
  const state = stateMatch ? stateMatch[1].toUpperCase() : null;
  if (!state) return null;
  return { street, state };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests - please slow down" });
  }

  const apiKey = process.env.REALIE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "not_configured" });
  }

  const { address, lat, lng } = req.body || {};

  try {
    if (typeof lat === "number" && typeof lng === "number") {
      const url = `https://app.realie.ai/api/public/property/location/?longitude=${lng}&latitude=${lat}&radius=0.03&limit=1`;
      const resp = await fetch(url, { headers: { Authorization: apiKey } });
      if (!resp.ok) return res.status(502).json({ error: "Realie API error" });
      const data = await resp.json();
      return res.status(200).json(data);
    }
    if (address && typeof address === "string" && address.length <= 300) {
      const parsed = parseUSAddress(address);
      if (!parsed) return res.status(400).json({ error: "Could not parse state from address" });
      const params = new URLSearchParams({ state: parsed.state, address: parsed.street });
      const resp = await fetch(`https://app.realie.ai/api/public/property/address/?${params}`, { headers: { Authorization: apiKey } });
      if (!resp.ok) return res.status(502).json({ error: "Realie API error" });
      const data = await resp.json();
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: "address, or lat+lng, required" });
  } catch (e) {
    return res.status(502).json({ error: e.message || "Could not reach parcel lookup service" });
  }
}
