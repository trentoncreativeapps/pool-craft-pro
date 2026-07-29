import "dotenv/config";
import express from "express";
import cors from "cors";
import { fal } from "@fal-ai/client";

// Standalone service (not a Vercel function) because FLUX renders can run well
// past Vercel's serverless timeout - this runs as a persistent process instead,
// deployed separately (Railway/Render/Fly/etc) from the main pool-craft-pro app.
fal.config({ credentials: process.env.FAL_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Same in-memory per-instance rate limit pattern used elsewhere in the main
// app's api/*.js functions - best-effort abuse/cost backstop, resets on restart.
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

function clientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

app.post("/api/generate-pool-render", async (req, res) => {
  if (isRateLimited(clientIp(req))) {
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

  try {
    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        prompt,
        image_url: `data:${mediaType};base64,${image.b64_json}`,
        strength: 0.75,
        num_images: 1,
      },
      logs: false,
    });

    const url = result?.data?.images?.[0]?.url;
    if (!url) return res.status(502).json({ error: "fal.ai returned no image" });
    return res.status(200).json({ url, b64_json: null });
  } catch (err) {
    console.error("generate-pool-render: fal error", err);
    return res.status(502).json({ error: err?.message || "Render service unavailable" });
  }
});

app.post("/api/tweak-render", async (req, res) => {
  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({ error: "Too many requests - please slow down" });
  }

  const { renderedImageUrl, maskUrl, tweakPrompt } = req.body || {};
  if (!renderedImageUrl || typeof renderedImageUrl !== "string") {
    return res.status(400).json({ error: "renderedImageUrl required" });
  }
  if (!maskUrl || typeof maskUrl !== "string") {
    return res.status(400).json({ error: "maskUrl required" });
  }
  if (!tweakPrompt || typeof tweakPrompt !== "string" || tweakPrompt.length > 2000) {
    return res.status(400).json({ error: "tweakPrompt required, must be a string under 2000 chars" });
  }

  try {
    const result = await fal.subscribe("fal-ai/flux/fill", {
      input: {
        prompt: tweakPrompt,
        image_url: renderedImageUrl,
        mask_url: maskUrl,
      },
      logs: false,
    });

    const url = result?.data?.images?.[0]?.url;
    if (!url) return res.status(502).json({ error: "fal.ai returned no image" });
    return res.status(200).json({ url });
  } catch (err) {
    console.error("tweak-render: fal error", err);
    return res.status(502).json({ error: err?.message || "Tweak service unavailable" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`pool-render-service listening on :${PORT}`));
