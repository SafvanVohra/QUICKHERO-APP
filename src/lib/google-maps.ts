/// <reference types="google.maps" />
// Load Google Maps JS API once, using your own browser API key.
// Uses loading=async + callback per Google's async loading guidance.

let loadPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __quickheroGmapsInit?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key) return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY — add it to your .env file"));

  loadPromise = new Promise((resolve, reject) => {
    window.__quickheroGmapsInit = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Google Maps failed to initialize"));
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      callback: "__quickheroGmapsInit",
      libraries: "marker",
    });
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(s);
  });
  return loadPromise;
}
