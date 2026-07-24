// Shared server-side xAI key so it never reaches the browser. Because this is one
// shared key paying for every user's renders (not a bring-your-own-key model), the
// per-instance rate limit below is a real cost backstop, not just abuse protection -
// but it's still best-effort/in-memory (resets on cold start, not distributed across
// instances). The app's own daily-render-cap UI is the primary per-user limit; this
// is the last line of defense if that's ever bypassed.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

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

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many render requests - please slow down" });
  }

  const { prompt, image } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 4000) {
    return res.status(400).json({ error: "prompt required, must be a string under 4000 chars" });
  }
  if (!image?.b64_json || typeof image.b64_json !== "string") {
    return res.status(400).json({ error: "image.b64_json required" });
  }
  const mediaType = image.media_type === "image/png" ? "image/png" : "image/jpeg";

  const resp = await fetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.XAI_KEY}` },
    body: JSON.stringify({
      model: "grok-imagine-image-quality",
      prompt,
      image: { b64_json: image.b64_json, media_type: mediaType },
      response_format: "b64_json",
      n: 1,
    }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    let parsed = {};
    try { parsed = JSON.parse(text); } catch {}
    const msg = parsed?.error?.message || text.slice(0, 140);
    return res.status(resp.status).json({ error: msg });
  }

  const data = JSON.parse(text);
  const b64Result = data?.data?.[0]?.b64_json;
  const urlResult = data?.data?.[0]?.url;
  if (!b64Result && !urlResult) {
    return res.status(502).json({ error: "Grok returned no image" });
  }
  return res.status(200).json({ b64_json: b64Result || null, url: urlResult || null });
}
