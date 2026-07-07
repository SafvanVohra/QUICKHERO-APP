import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Siren, MapPin, ChevronRight, Radio } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { getCurrentPosition, haversineKm, type Coords } from "@/lib/geolocation";

type Req = {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  address: string | null;
  created_at: string;
  requester_id: string;
  lat: number;
  lng: number;
};

const RADIUS_KM = 10;

/**
 * A horizontal ticker bar that lists nearby OPEN help requests in real time.
 * Signed-in users only. Auto-updates on inserts/updates/deletes.
 */
export function LiveRequestsBar() {
  const { user } = useAuth();
  const [me, setMe] = useState<Coords | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    getCurrentPosition().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("help_requests")
        .select("id,title,category,severity,status,address,created_at,requester_id,lat,lng")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled && data) setReqs(data as Req[]);
    })();

    const ch = supabase
      .channel(`live_req_bar_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "help_requests" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Req;
            if (row.status === "open") setReqs((p) => [row, ...p].slice(0, 30));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Req;
            setReqs((p) => {
              const rest = p.filter((r) => r.id !== row.id);
              return row.status === "open" ? [row, ...rest] : rest;
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            setReqs((p) => p.filter((r) => r.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const nearby = useMemo(() => {
    const mine = user?.id;
    return reqs
      .filter((r) => r.requester_id !== mine)
      .map((r) => ({
        ...r,
        dist_km: me ? haversineKm(me, { lat: r.lat, lng: r.lng }) : null,
      }))
      .filter((r) => (r.dist_km == null ? true : r.dist_km <= RADIUS_KM))
      .sort((a, b) => (a.dist_km ?? 0) - (b.dist_km ?? 0))
      .slice(0, 12);
  }, [reqs, me, user?.id]);

  if (!user || nearby.length === 0 || !open) return null;

  return (
    <div
      role="region"
      aria-label="Live nearby help requests"
      className="fixed inset-x-0 top-[64px] z-40 border-b border-border/60 bg-card/85 backdrop-blur-xl shadow-soft"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2">
        <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-danger sm:inline-flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-danger/60" />
            <span className="relative h-2 w-2 rounded-full bg-danger" />
          </span>
          <Radio className="h-3 w-3" aria-hidden="true" /> Live · {nearby.length}
        </div>

        <div className="scrollbar-none flex flex-1 items-center gap-2 overflow-x-auto">
          <AnimatePresence initial={false}>
            {nearby.map((r) => {
              const tone =
                r.severity === "critical"
                  ? "border-danger/50 bg-danger/10 text-danger"
                  : r.severity === "high"
                  ? "border-warning/60 bg-warning/10 text-warning"
                  : "border-primary/40 bg-primary/10 text-primary";
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="shrink-0"
                >
                  <Link
                    to="/requests/$id"
                    params={{ id: r.id }}
                    className={`group inline-flex max-w-[280px] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-soft transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tone}`}
                  >
                    <Siren className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate text-foreground">{r.title}</span>
                    {r.dist_km != null && (
                      <span className="shrink-0 rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-bold text-subtext">
                        {r.dist_km < 1
                          ? `${Math.round(r.dist_km * 1000)} m`
                          : `${r.dist_km.toFixed(1)} km`}
                      </span>
                    )}
                    {r.address && (
                      <span className="hidden items-center gap-0.5 text-[10px] text-subtext md:inline-flex">
                        <MapPin className="h-3 w-3" aria-hidden="true" /> {r.address.split(",")[0]}
                      </span>
                    )}
                    <span className="text-[10px] text-subtext">
                      · {formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true })}
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide live bar"
          className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-subtext hover:bg-muted"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
