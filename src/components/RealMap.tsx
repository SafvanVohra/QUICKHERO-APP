/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2, Locate, Maximize2, Minimize2, Navigation2 } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps";

export type RealMapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  /** Legacy tone string like "bg-danger"; mapped to a hex color. */
  tone?: string;
  color?: string;
  /** Render as pulsing "you are here" style pin. */
  pulse?: boolean;
};

const TONE_TO_COLOR: Record<string, string> = {
  "bg-danger": "#dc2626",
  "bg-warning": "#f59e0b",
  "bg-primary": "#2563eb",
  "bg-accent": "#7c3aed",
  "bg-success": "#16a34a",
  "bg-secondary": "#0ea5e9",
};

/**
 * Real Google Maps replacement for StubMap. Drop-in compatible API:
 * accepts markers[], optional center, className, height.
 */
export function RealMap({
  markers,
  center,
  className = "",
  height = 360,
  radiusKm,
  directionsTo,
  showControls = true,
}: {
  markers: RealMapMarker[];
  center?: { lat: number; lng: number };
  className?: string;
  height?: number;
  radiusKm?: number;
  /** If set, shows a "Directions" button opening Google Maps navigation. */
  directionsTo?: { lat: number; lng: number };
  /** Show recenter + fullscreen overlay buttons. Default true. */
  showControls?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const c = center ?? markers[0] ?? { lat: 20.5937, lng: 78.9629 };

  const recenter = () => {
    if (!mapRef.current) return;
    mapRef.current.panTo(c);
    mapRef.current.setZoom(15);
  };

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: c,
          zoom: markers.length ? 14 : 5,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
          ],
        });
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    // Clear existing markers
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    for (const m of markers) {
      const color = m.color ?? (m.tone ? TONE_TO_COLOR[m.tone] ?? "#dc2626" : "#dc2626");
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.label,
        animation: m.pulse ? google.maps.Animation.BOUNCE : undefined,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: m.pulse ? 12 : 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: m.pulse ? 4 : 2.5,
        },
      });
      if (m.label) {
        const info = new google.maps.InfoWindow({ content: `<div style="font-family:inherit;font-weight:600">${escapeHtml(m.label)}</div>` });
        marker.addListener("click", () => info.open(map, marker));
      }
      markersRef.current.push(marker);
      bounds.extend({ lat: m.lat, lng: m.lng });
    }

    // Radius circle
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
    if (radiusKm && radiusKm > 0) {
      circleRef.current = new google.maps.Circle({
        map,
        center: c,
        radius: radiusKm * 1000,
        strokeColor: "#2563eb",
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
        fillColor: "#2563eb",
        fillOpacity: 0.08,
      });
    }

    if (markers.length > 1) map.fitBounds(bounds, 60);
    else if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(15);
    } else if (center) {
      map.setCenter(center);
    }
  }, [ready, markers, center, radiusKm]);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden rounded-3xl border border-border bg-muted shadow-soft ${fullscreen ? "!rounded-none" : ""} ${className}`}
      style={{ height: fullscreen ? "100%" : height }}
      role="region"
      aria-label="Live emergency map"
    >
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10" role="status" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Loading map</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-danger" role="alert">
          Map failed to load: {error}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />

      {showControls && ready && !error && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={recenter}
            aria-label="Re-center map"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-card/95 text-foreground shadow-elevate ring-1 ring-border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Locate className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen map" : "Open map fullscreen"}
            aria-pressed={fullscreen}
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-card/95 text-foreground shadow-elevate ring-1 ring-border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      )}

      {directionsTo && ready && !error && (
        <button
          type="button"
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${directionsTo.lat},${directionsTo.lng}&travelmode=driving`;
            const w = window.open(url, "_blank", "noopener,noreferrer");
            if (!w) window.location.href = url;
          }}
          aria-label="Open directions in Google Maps"
          className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-primary transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Navigation2 className="h-4 w-4" aria-hidden="true" /> Directions
        </button>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] as string));
}
