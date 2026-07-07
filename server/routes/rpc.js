import express from "express";
import { Profile } from "../models/index.js";
import { requireAuth } from "../lib/auth.js";
import { serialize } from "../lib/serialize.js";
import { haversineKm } from "../lib/geo.js";

const router = express.Router();
router.use(requireAuth);

router.post("/nearby_volunteers", async (req, res) => {
  const { _lat, _lng, _radius_km, _limit } = req.body || {};
  if (typeof _lat !== "number" || typeof _lng !== "number") {
    return res.json({ data: null, error: { message: "_lat and _lng are required" } });
  }
  const radius = _radius_km ?? 15;
  const limit = _limit ?? 20;

  const volunteers = await Profile.find({
    is_volunteer: true,
    is_available: true,
    current_lat: { $ne: null },
    current_lng: { $ne: null },
  }).lean();

  const withDist = volunteers
    .map((v) => ({ ...v, distance_km: haversineKm(v.current_lat, v.current_lng, _lat, _lng) }))
    .filter((v) => v.distance_km <= radius)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  const rows = serialize(withDist).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    photo_url: r.photo_url,
    skills: r.skills,
    is_verified: r.is_verified,
    current_lat: r.current_lat,
    current_lng: r.current_lng,
    distance_km: r.distance_km,
  }));

  res.json({ data: rows, error: null });
});

export default router;
