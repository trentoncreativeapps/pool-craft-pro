// One-off script: generates a photorealistic reference photo for each entry/
// feature type shown in the Entry & Features tab, using the same fal.ai FLUX
// account already configured for user-facing renders. Run once from
// render-service/ (needs FAL_KEY in .env.local) - output goes to
// public/images/entry-features/{id}.jpg for the app to reference directly as
// static assets, so this cost is paid once, not per page view.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";

fal.config({ credentials: process.env.FAL_KEY });

const OUT_DIR = path.join(process.cwd(), "..", "public", "images", "entry-features");
fs.mkdirSync(OUT_DIR, { recursive: true });

const FEATURES = [
  { id: "beach_entry", prompt: "Photorealistic real estate photograph of a luxury backyard swimming pool with a zero-depth beach entry - a gradual sandy-colored slope transitioning into clear blue water, resort-style landscaping, sunny day, wide shot" },
  { id: "baja_shelf", prompt: "Photorealistic real estate photograph of a backyard swimming pool with a Baja shelf tanning ledge - a shallow sun shelf a few inches deep with two lounge chairs sitting in the water, blue pool tile, sunny day" },
  { id: "steps_corner", prompt: "Photorealistic real estate photograph of a backyard swimming pool with classic corner entry steps and a stainless steel handrail, clear blue water, concrete deck, sunny day" },
  { id: "steps_end", prompt: "Photorealistic real estate photograph of a backyard swimming pool with full-width steps spanning the entire shallow end, clear blue water, modern backyard patio, sunny day" },
  { id: "steps_curved", prompt: "Photorealistic real estate photograph of an elegant backyard swimming pool with curved Roman-style steps, upscale landscaping, clear blue water, sunny day" },
  { id: "swim_up_bar", prompt: "Photorealistic real estate photograph of a luxury backyard pool with a swim-up bar - submerged bar stools at a stone counter built into the pool edge, tropical landscaping, sunny day" },
  { id: "grotto", prompt: "Photorealistic real estate photograph of a backyard swimming pool with a natural rock grotto and waterfall cascading into the pool, lush landscaping, sunny day" },
  { id: "infinity_edge", prompt: "Photorealistic real estate photograph of a luxury infinity edge backyard swimming pool overlooking a scenic hillside view, vanishing edge, clear blue water, golden hour lighting" },
  { id: "spa_attached", prompt: "Photorealistic real estate photograph of a backyard swimming pool with an attached raised spa hot tub spilling over into the main pool, natural stone accents, sunny day" },
  { id: "splash_pad", prompt: "Photorealistic real estate photograph of a backyard zero-depth splash pad play area with water jets for children next to a swimming pool, family friendly backyard, sunny day" },
  { id: "diving_rock", prompt: "Photorealistic real estate photograph of a backyard swimming pool with a natural boulder diving rock platform at the deep end, landscaping, sunny day" },
  { id: "sun_shelf_umbrella", prompt: "Photorealistic real estate photograph of a backyard swimming pool tanning ledge sun shelf with a built-in patio umbrella and lounge chairs sitting in shallow water, sunny day" },
];

async function run() {
  for (const f of FEATURES) {
    const outPath = path.join(OUT_DIR, `${f.id}.jpg`);
    if (fs.existsSync(outPath)) {
      console.log(`skip ${f.id} (already exists)`);
      continue;
    }
    console.log(`generating ${f.id}...`);
    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: { prompt: f.prompt, image_size: "landscape_4_3", num_images: 1 },
        logs: false,
      });
      const url = result?.data?.images?.[0]?.url;
      if (!url) { console.error(`  no image returned for ${f.id}`); continue; }
      const resp = await fetch(url);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      console.log(`  saved ${outPath} (${buf.length} bytes)`);
    } catch (err) {
      console.error(`  failed ${f.id}:`, err?.message || err);
    }
  }
}

run().then(() => console.log("done")).catch((e) => { console.error(e); process.exit(1); });
