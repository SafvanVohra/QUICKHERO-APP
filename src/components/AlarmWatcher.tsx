import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Siren, X, MapPin, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { formatDistanceToNowStrict } from "date-fns";
import { getCurrentPosition, haversineKm, type Coords } from "@/lib/geolocation";

type Alarm = {
  id: string;
  title: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  address: string | null;
  created_at: string;
  requester_id: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
};

/** 10 km diameter = 5 km radius around the user. */
const NEARBY_RADIUS_KM = 5;

const STORAGE_MUTED = "quickhero:alarm_muted";
const STORAGE_SEEN = "quickhero:alarm_seen";

/**
 * Global "dedication alarm" — signed-in users hear an alarm and see a
 * dismissible banner every time a new help request is posted.
 * Own requests are ignored. Notifications persist until manually dismissed.
 */
export function AlarmWatcher() {
  const { user } = useAuth();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_MUTED) === "1";
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bootTimeRef = useRef<string>(new Date().toISOString());
  const meRef = useRef<Coords | null>(null);

  useEffect(() => {
    if (!user) return;
    // Best-effort geolocation. If denied, we fall back to no alarms (nearby-only).
    getCurrentPosition()
      .then((c) => { meRef.current = c; })
      .catch(() => { meRef.current = null; });

    const seen = new Set<string>(
      JSON.parse(localStorage.getItem(STORAGE_SEEN) || "[]") as string[],
    );

    const ch = supabase
      .channel(`alarm_watch_${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "help_requests" },
        (payload) => {
          const row = payload.new as Alarm & { status?: string };
          if (!row?.id) return;
          if (row.requester_id === user.id) return;
          if (seen.has(row.id)) return;

          // Only alert when the request is within the nearby radius.
          if (!meRef.current || row.lat == null || row.lng == null) return;
          const dist = haversineKm(meRef.current, { lat: row.lat, lng: row.lng });
          if (dist > NEARBY_RADIUS_KM) return;

          seen.add(row.id);
          try {
            localStorage.setItem(STORAGE_SEEN, JSON.stringify([...seen].slice(-50)));
          } catch { /* ignore quota */ }
          setAlarms((prev) => [{ ...row, distance_km: dist }, ...prev].slice(0, 5));
          void playAlarm(row.severity);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const playAlarm = async (severity: string) => {
    if (muted) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const now = ctx.currentTime;
      const beeps = severity === "critical" ? 4 : severity === "high" ? 3 : 2;
      const freq = severity === "critical" ? 1000 : severity === "high" ? 820 : 660;
      for (let i = 0; i < beeps; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.35);
        osc.frequency.setValueAtTime(freq * 0.7, now + i * 0.35 + 0.12);
        gain.gain.setValueAtTime(0.0001, now + i * 0.35);
        gain.gain.exponentialRampToValueAtTime(0.28, now + i * 0.35 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.35);
        osc.stop(now + i * 0.35 + 0.3);
      }
    } catch {
      /* audio unavailable */
    }
  };

  const dismiss = (id: string) =>
    setAlarms((prev) => prev.filter((a) => a.id !== id));

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(STORAGE_MUTED, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  if (!user) return null;

  return (
    <>
      {/* Floating mute toggle so users can silence the alarm any time */}
      {alarms.length > 0 && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute alarm" : "Mute alarm"}
          className="fixed bottom-4 left-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-elevate hover:bg-muted"
        >
          {muted ? <VolumeX className="h-5 w-5 text-subtext" /> : <Volume2 className="h-5 w-5 text-primary" />}
        </button>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-[64px] z-[55] flex flex-col items-center gap-2 px-3 sm:top-20">
        <AnimatePresence initial={false}>
          {alarms.map((a) => {
            const tone =
              a.severity === "critical" ? "from-red-600 to-rose-500 border-red-400" :
              a.severity === "high" ? "from-orange-500 to-amber-500 border-orange-400" :
              "from-primary to-blue-500 border-primary/50";
            return (
              <motion.div
                key={a.id}
                initial={{ y: -30, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className={`pointer-events-auto w-full max-w-lg rounded-2xl border bg-gradient-to-r ${tone} p-0.5 shadow-elevate`}
              >
                <div className="flex items-start gap-3 rounded-[14px] bg-card p-3 sm:p-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white bg-gradient-to-br ${tone.replace("border-red-400","").replace("border-orange-400","").replace("border-primary/50","")}`}>
                    <motion.span
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1.1 }}
                    >
                      <Siren className="h-5 w-5" />
                    </motion.span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-danger">
                        {a.severity === "critical" ? "🚨 Critical" : a.severity === "high" ? "⚠️ High" : "New alert"}
                      </span>
                      <span className="text-[10px] text-subtext">
                        {formatDistanceToNowStrict(new Date(a.created_at), { addSuffix: true })}
                      </span>
                      {typeof a.distance_km === "number" && (
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {a.distance_km < 1 ? `${Math.round(a.distance_km * 1000)} m` : `${a.distance_km.toFixed(1)} km`} away
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold">{a.title}</div>
                    <div className="text-xs text-subtext truncate">
                      {a.category.replace("_", " ")}
                      {a.address ? (
                        <span className="inline-flex items-center gap-1 ml-1">
                          · <MapPin className="h-3 w-3" /> {a.address}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        to="/requests/$id"
                        params={{ id: a.id }}
                        onClick={() => dismiss(a.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-primary"
                      >
                        Help now <ArrowRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => dismiss(a.id)}
                        className="rounded-full px-2 py-1.5 text-xs font-semibold text-subtext hover:bg-muted"
                      >
                        Not me
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(a.id)}
                    aria-label="Dismiss"
                    className="rounded-full p-1 text-subtext hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
