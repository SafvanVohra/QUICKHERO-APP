/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "@/lib/google-maps";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { computeEta } from "@/lib/eta.functions";

type ReqRow = {
  id: string; title: string; category: string; severity: string; status: string;
  lat: number; lng: number; address: string | null; created_at: string;
  requester_id: string; accepted_by: string | null; resolved_at: string | null;
  updated_at: string;
};
type VolRow = {
  id: string; full_name: string | null; current_lat: number | null;
  current_lng: number | null; is_available: boolean; is_verified: boolean;
};

const ACTIVE_STATUSES = ["open", "accepted", "in_progress"] as const;

export function LiveMap({ height = 560 }: { height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [volunteers, setVolunteers] = useState<VolRow[]>([]);
  const [selected, setSelected] = useState<ReqRow | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);
  const etaFn = computeEta;

  // Load map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const first = requests[0];
        const center = first
          ? { lat: first.lat, lng: first.lng }
          : { lat: 20.5937, lng: 78.9629 }; // India centroid fallback
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: first ? 12 : 5,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          ],
        });
        infoRef.current = new google.maps.InfoWindow();
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data + realtime
  useEffect(() => {
    const loadReqs = () =>
      supabase.from("help_requests")
        .select("id,title,category,severity,status,lat,lng,address,created_at,requester_id,accepted_by,resolved_at,updated_at")
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .then(({ data }) => setRequests((data as ReqRow[]) ?? []));
    const loadVols = () =>
      supabase.from("profiles")
        .select("id,full_name,current_lat,current_lng,is_available,is_verified")
        .eq("is_volunteer", true)
        .neq("current_lat", null)
        .neq("current_lng", null)
        .then(({ data }) => setVolunteers((data as VolRow[]) ?? []));
    loadReqs(); loadVols();
    const ch = supabase.channel("admin_livemap")
      .on("postgres_changes", { event: "*", schema: "public", table: "help_requests" }, loadReqs)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadVols)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Render markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const keep = new Set<string>();

    const upsert = (
      key: string, position: google.maps.LatLngLiteral,
      color: string, label: string, onClick: () => void,
    ) => {
      keep.add(key);
      let m = markersRef.current.get(key);
      const icon: google.maps.Symbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      };
      if (!m) {
        m = new google.maps.Marker({ position, map, title: label, icon });
        m.addListener("click", onClick);
        markersRef.current.set(key, m);
      } else {
        m.setPosition(position);
        m.setTitle(label);
        m.setIcon(icon);
      }
    };

    for (const r of requests) {
      const color = r.severity === "critical" ? "#dc2626"
        : r.severity === "high" ? "#f59e0b"
        : r.status === "accepted" || r.status === "in_progress" ? "#2563eb"
        : "#ef4444";
      upsert(`r:${r.id}`, { lat: r.lat, lng: r.lng }, color, r.title, () => {
        setSelected(r);
        if (infoRef.current) {
          const elapsed = formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true });
          infoRef.current.setContent(
            `<div style="font-family:inherit;min-width:200px">
              <div style="font-weight:700;margin-bottom:4px">${escapeHtml(r.title)}</div>
              <div style="font-size:12px;color:#64748b">${escapeHtml(r.category.replace("_"," "))} · ${escapeHtml(r.severity)}</div>
              <div style="font-size:12px;margin-top:4px">Opened ${elapsed}</div>
              ${r.address ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${escapeHtml(r.address)}</div>` : ""}
              <div style="font-size:12px;margin-top:4px">Status: <b>${escapeHtml(r.status.replace("_"," "))}</b></div>
            </div>`
          );
          infoRef.current.setPosition({ lat: r.lat, lng: r.lng });
          infoRef.current.open(map);
        }
      });
    }
    for (const v of volunteers) {
      if (v.current_lat == null || v.current_lng == null) continue;
      upsert(`v:${v.id}`, { lat: v.current_lat, lng: v.current_lng }, "#16a34a",
        `${v.full_name ?? "Volunteer"}${v.is_available ? " · available" : ""}`,
        () => { /* no-op */ });
    }

    // Drop stale
    for (const [k, m] of markersRef.current.entries()) {
      if (!keep.has(k)) { m.setMap(null); markersRef.current.delete(k); }
    }
  }, [ready, requests, volunteers]);

  // Compute ETA when selected request is accepted by a volunteer with location
  useEffect(() => {
    setEtaText(null);
    if (!selected?.accepted_by) return;
    const vol = volunteers.find((v) => v.id === selected.accepted_by);
    if (!vol?.current_lat || !vol?.current_lng) return;
    let cancelled = false;
    etaFn({ data: {
      originLat: vol.current_lat, originLng: vol.current_lng,
      destLat: selected.lat, destLng: selected.lng,
    } })
      .then((r) => {
        if (cancelled) return;
        if (r.seconds == null) return;
        const mins = Math.max(1, Math.round(r.seconds / 60));
        const km = r.meters ? (r.meters / 1000).toFixed(1) : null;
        setEtaText(`${mins} min${km ? ` · ${km} km` : ""}`);
      })
      .catch(() => setEtaText("ETA unavailable"));
    return () => { cancelled = true; };
  }, [selected, volunteers, etaFn]);

  const stats = useMemo(() => ({
    open: requests.filter((r) => r.status === "open").length,
    active: requests.filter((r) => r.status !== "open").length,
    vols: volunteers.filter((v) => v.is_available).length,
  }), [requests, volunteers]);

  if (error) {
    return (
      <div className="rounded-3xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
        Map failed to load: {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative rounded-3xl overflow-hidden border border-border shadow-soft bg-muted" style={{ height }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Open" value={stats.open} tone="bg-danger/10 text-danger" />
          <MiniStat label="In progress" value={stats.active} tone="bg-primary/10 text-primary" />
          <MiniStat label="Volunteers" value={stats.vols} tone="bg-success/10 text-success" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          {selected ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{selected.title}</div>
                  <div className="text-xs text-subtext">
                    {selected.category.replace("_", " ")} · {selected.severity}
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">{selected.status.replace("_", " ")}</Badge>
              </div>
              {selected.address && (
                <div className="text-xs text-subtext flex items-start gap-1">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {selected.address}
                </div>
              )}
              <div className="text-xs">
                <span className="text-subtext">Opened:</span>{" "}
                {formatDistanceToNowStrict(new Date(selected.created_at), { addSuffix: true })}
              </div>
              {selected.accepted_by && (
                <div className="text-xs">
                  <span className="text-subtext">Accepted:</span>{" "}
                  {formatDistanceToNowStrict(new Date(selected.updated_at), { addSuffix: true })}
                </div>
              )}
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                <span className="text-subtext text-xs">ETA to victim: </span>
                <b>{selected.accepted_by ? (etaText ?? "computing…") : "no volunteer yet"}</b>
              </div>
            </div>
          ) : (
            <div className="text-sm text-subtext">Click a red pin to see live ETA and details.</div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-[11px] text-subtext space-y-1">
          <LegendDot color="#dc2626" label="Critical alert" />
          <LegendDot color="#f59e0b" label="High-priority alert" />
          <LegendDot color="#ef4444" label="Open alert" />
          <LegendDot color="#2563eb" label="Accepted / in progress" />
          <LegendDot color="#16a34a" label="Volunteer" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl p-3 ${tone}`}>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] as string));
}
