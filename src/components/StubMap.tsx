import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

type Marker = { id: string; lat: number; lng: number; label?: string; tone?: string };

/**
 * Lightweight stub map: renders markers on a stylized grid.
 * Coordinates are projected linearly around the centre.
 * Swap for real Mapbox / Leaflet once a token is provided.
 */
export function StubMap({
  markers,
  center,
  className = "",
  height = 360,
}: {
  markers: Marker[];
  center?: { lat: number; lng: number };
  className?: string;
  height?: number;
}) {
  const c = center ?? markers[0] ?? { lat: 0, lng: 0 };
  // Scale ~ 0.02° per half-viewport
  const scale = 0.02;
  const project = (m: Marker) => ({
    left: `${50 + Math.max(-50, Math.min(50, ((m.lng - c.lng) / scale) * 50))}%`,
    top: `${50 - Math.max(-50, Math.min(50, ((m.lat - c.lat) / scale) * 50))}%`,
  });

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-accent/10 shadow-soft ${className}`}
      style={{ height }}
      aria-label="Emergency map preview"
    >
      {/* grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* pulse rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inline-flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30"
            style={{
              transform: `translate(-50%,-50%) scale(${1 + i * 0.6})`,
              animation: `blob 4s ease-in-out ${i * 0.6}s infinite`,
              opacity: 0.5 - i * 0.15,
            }}
          />
        ))}
      </div>

      {markers.map((m, i) => {
        const pos = project(m);
        return (
          <motion.div
            key={m.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={pos}
          >
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-elevate text-xs font-semibold text-white ${m.tone ?? "bg-danger"}`}>
              <MapPin className="h-3.5 w-3.5" />
              {m.label ?? "Alert"}
            </div>
            <div className="mx-auto h-2 w-2 -translate-y-0.5 rotate-45 bg-white/80" />
          </motion.div>
        );
      })}

      <div className="absolute bottom-3 right-3 rounded-full bg-card/80 backdrop-blur px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtext">
        Stub map · plug in Mapbox token
      </div>
    </div>
  );
}
