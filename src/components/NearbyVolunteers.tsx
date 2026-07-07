import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type Volunteer = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  is_verified: boolean | null;
  skills: string[] | null;
  distance_km: number;
};

function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function distanceLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function NearbyVolunteers({
  lat,
  lng,
  radiusKm = 10,
  limit = 8,
}: { lat: number; lng: number; radiusKm?: number; limit?: number }) {
  const [rows, setRows] = useState<Volunteer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    supabase
      .rpc("nearby_volunteers", { _lat: lat, _lng: lng, _radius_km: radiusKm, _limit: limit })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setRows((data ?? []) as Volunteer[]);
      });
    return () => { cancelled = true; };
  }, [lat, lng, radiusKm, limit]);

  return (
    <section
      aria-label={`Nearby volunteers within ${radiusKm} km`}
      className="rounded-3xl border border-border bg-card p-5 shadow-soft"
    >
      <header className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-bold leading-tight">Nearby heroes</h3>
          <p className="text-xs text-subtext">Within {radiusKm} km of this alert</p>
        </div>
        {rows && (
          <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">
            {rows.length}
          </span>
        )}
      </header>

      <div className="mt-4">
        {rows === null && !error && (
          <div className="flex items-center gap-2 py-4 text-sm text-subtext" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Finding nearby heroes…
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
            Couldn't load volunteers: {error}
          </p>
        )}

        {rows && rows.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-subtext">
            No available volunteers in this area yet. Alerts still fan out — help may arrive from further away.
          </div>
        )}

        {rows && rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((v, i) => (
              <motion.li
                key={v.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-2.5"
              >
                <Avatar className="h-10 w-10 ring-1 ring-primary/20">
                  {v.photo_url && <AvatarImage src={v.photo_url} alt="" />}
                  <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
                    {initials(v.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{v.full_name ?? "Volunteer"}</span>
                    <VerifiedBadge verified={v.is_verified} size="xs" />
                  </div>
                  {v.skills && v.skills.length > 0 && (
                    <div className="truncate text-[11px] text-subtext">
                      {v.skills.slice(0, 3).join(" · ")}
                    </div>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {distanceLabel(v.distance_km)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
