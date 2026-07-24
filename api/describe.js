// Server-side proxy for the "AI Designer Notes" descriptive text feature.
// Previously called api.anthropic.com directly from the browser with no
// auth header at all, so it always 401'd. Requires ANTHROPIC_API_KEY set
// server-side in Vercel.
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

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests - please slow down" });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 2000) {
    return res.status(400).json({ error: "prompt required, must be a string under 2000 chars" });
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 220,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    return res.status(502).json({ error: "Description service unavailable" });
  }
  const data = await resp.json();
  const text = data?.content?.[0]?.text || null;
  return res.status(200).json({ text });
}
