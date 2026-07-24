export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { lat, lng, zoom = 20, width = 560, height = 440 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng required" });
  }

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=satellite&key=${process.env.GOOGLE_MAPS_KEY}`;

  const mapRes = await fetch(url);
  if (!mapRes.ok) {
    return res.status(502).json({ error: "Map service unavailable" });
  }

  const buffer = await mapRes.arrayBuffer();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(Buffer.from(buffer));
}
