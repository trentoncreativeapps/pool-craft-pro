// Best-effort in-memory rate limit. Resets on cold start and is per-instance only
// (Vercel can run multiple instances), so it throttles a single abusive client on a
// warm instance but is not a real distributed limiter. For stronger protection, back
// this with Upstash/Vercel KV.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

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

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests - please slow down" });
  }

  const { lat, lng, address, zoom = 20, width = 560, height = 440 } = req.query;
  const zoomNum = Number(zoom), widthNum = Number(width), heightNum = Number(height);

  let center;
  if (address) {
    if (typeof address !== "string" || address.length > 200) {
      return res.status(400).json({ error: "address must be a string under 200 characters" });
    }
    center = address; // Google Static Maps geocodes free-text addresses server-side
  } else {
    const latNum = Number(lat), lngNum = Number(lng);
    if (!lat || !lng || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: "lat and lng (or address) required" });
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: "lat/lng out of range" });
    }
    center = `${latNum},${lngNum}`;
  }
  if (!Number.isInteger(zoomNum) || zoomNum < 0 || zoomNum > 21) {
    return res.status(400).json({ error: "zoom must be an integer between 0 and 21" });
  }
  if (!Number.isInteger(widthNum) || !Number.isInteger(heightNum) || widthNum < 50 || heightNum < 50 || widthNum > 1280 || heightNum > 1280) {
    return res.status(400).json({ error: "width/height must be integers between 50 and 1280" });
  }

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=${zoomNum}&size=${widthNum}x${heightNum}&maptype=satellite&key=${process.env.GOOGLE_MAPS_KEY}`;

  const mapRes = await fetch(url);
  if (!mapRes.ok) {
    return res.status(502).json({ error: "Map service unavailable" });
  }

  const buffer = await mapRes.arrayBuffer();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(Buffer.from(buffer));
}
