import express from "express";
import { requireAuth } from "../lib/auth.js";
import { isAdmin } from "../lib/permissions.js";
import { haversineKm } from "../lib/geo.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const admin = await isAdmin(req.userId);
  if (!admin) return res.status(403).json({ error: { message: "Admins only" } });

  const { originLat, originLng, destLat, destLng } = req.body || {};
  if ([originLat, originLng, destLat, destLng].some((v) => typeof v !== "number")) {
    return res.status(400).json({ error: { message: "originLat, originLng, destLat, destLng are required" } });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (apiKey) {
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}`,
      );
      const json = await resp.json();
      const leg = json?.routes?.[0]?.legs?.[0];
      if (leg) {
        return res.json({ text: leg.duration?.text ?? null, seconds: leg.duration?.value ?? null, meters: leg.distance?.value ?? null });
      }
    } catch (e) {
      console.error("ETA lookup failed, falling back to estimate:", e.message);
    }
  }

  // Fallback: rough straight-line estimate at ~30km/h average city speed.
  const km = haversineKm(originLat, originLng, destLat, destLng);
  const minutes = Math.max(1, Math.round((km / 30) * 60));
  res.json({ text: `~${minutes} min (estimate)`, seconds: minutes * 60, meters: Math.round(km * 1000) });
});

export default router;
