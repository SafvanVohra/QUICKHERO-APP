import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, ChevronRight, Clock, MapPin, Plus, Radio, Shield, Siren, Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RealMap } from "@/components/RealMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { getCurrentPosition, haversineKm, type Coords } from "@/lib/geolocation";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — QuickHero" },
      { name: "description", content: "View active emergency requests near you, track live volunteer response, and monitor community safety in real-time." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Req = {
  id: string; requester_id: string; category: string; title: string;
  description: string | null; severity: string; status: string;
  lat: number; lng: number; address: string | null;
  accepted_by: string | null; created_at: string;
};

const severityTone: Record<string, string> = {
  low: "bg-primary/10 text-primary",
  medium: "bg-secondary/10 text-secondary",
  high: "bg-warning/10 text-warning",
  critical: "bg-danger text-danger-foreground",
};
const statusTone: Record<string, string> = {
  open: "bg-danger/10 text-danger",
  accepted: "bg-primary/10 text-primary",
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  cancelled: "bg-muted text-subtext",
};

function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"feed" | "mine">("feed");
  const [requests, setRequests] = useState<Req[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => { getCurrentPosition().then(setCoords).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("help_requests").select("*")
        .order("created_at", { ascending: false }).limit(100);
      if (!cancelled && data) setRequests(data as Req[]);
    };
    load();

    const channel = supabase
      .channel("help_requests_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "help_requests" }, (payload) => {
        setRequests((prev) => {
          if (payload.eventType === "INSERT") return [payload.new as Req, ...prev];
          if (payload.eventType === "UPDATE") return prev.map((r) => r.id === (payload.new as Req).id ? payload.new as Req : r);
          if (payload.eventType === "DELETE") return prev.filter((r) => r.id !== (payload.old as Req).id);
          return prev;
        });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    if (tab === "mine") return requests.filter((r) => r.requester_id === user?.id);
    return requests.filter((r) => r.status !== "resolved" && r.status !== "cancelled");
  }, [requests, tab, user?.id]);

  const stats = useMemo(() => ({
    active: requests.filter((r) => r.status === "open" || r.status === "accepted" || r.status === "in_progress").length,
    mine: requests.filter((r) => r.requester_id === user?.id).length,
    resolved: requests.filter((r) => r.status === "resolved").length,
  }), [requests, user?.id]);

  const mapMarkers = filtered.slice(0, 20).map((r) => ({
    id: r.id, lat: r.lat, lng: r.lng, label: r.category,
    tone: r.severity === "critical" ? "bg-danger" : r.severity === "high" ? "bg-warning" : "bg-primary",
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Command center</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Live emergency dashboard</h1>
            <p className="mt-1 text-sm text-subtext">Every alert around you, updating in real time.</p>
          </div>
          <Link to="/request/new">
            <Button size="lg" className="rounded-full bg-gradient-danger text-danger-foreground shadow-danger">
              <Plus className="mr-1.5 h-4 w-4" /> New alert
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active alerts", value: stats.active, icon: Radio, tone: "bg-danger/10 text-danger" },
            { label: "My requests", value: stats.mine, icon: Siren, tone: "bg-primary/10 text-primary" },
            { label: "Resolved (all)", value: stats.resolved, icon: Shield, tone: "bg-success/10 text-success" },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-3xl font-extrabold">{s.value}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-subtext">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1 shadow-soft">
              {(["feed", "mine"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                    tab === t ? "bg-gradient-primary text-primary-foreground shadow-primary" : "text-subtext"
                  }`}>
                  {t === "feed" ? "Live feed" : "My requests"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {filtered.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border p-10 text-center">
                    <Users className="mx-auto h-8 w-8 text-subtext" />
                    <p className="mt-3 text-sm text-subtext">
                      {tab === "mine" ? "You haven't created any requests yet." : "All quiet — no active alerts."}
                    </p>
                  </div>
                ) : filtered.map((r) => {
                  const km = coords ? haversineKm(coords, { lat: r.lat, lng: r.lng }) : null;
                  return (
                    <motion.div key={r.id} layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Link to="/requests/$id" params={{ id: r.id }}
                        className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevate">
                        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${severityTone[r.severity]}`}>
                          <Activity className="h-6 w-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{r.title}</h3>
                            <Badge className={`capitalize ${statusTone[r.status]}`} variant="secondary">{r.status.replace("_", " ")}</Badge>
                            <Badge variant="outline" className="capitalize">{r.category.replace("_", " ")}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-subtext">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                            {km !== null && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away</span>}
                            {r.address && <span className="truncate max-w-[220px]">· {r.address}</span>}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-subtext transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <RealMap markers={mapMarkers} center={coords ?? undefined} height={420} />
            <p className="mt-3 text-center text-xs text-subtext">
              Showing {mapMarkers.length} live alert{mapMarkers.length === 1 ? "" : "s"} near you.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
