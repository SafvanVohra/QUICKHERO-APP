type EtaInput = {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
};

type EtaResult = { text?: string | null; seconds: number | null; meters: number | null };

/**
 * Compute driving ETA + distance via the backend (which calls Google's
 * Directions API if GOOGLE_MAPS_SERVER_KEY is set, otherwise falls back to a
 * straight-line estimate). Admin-only — enforced server-side.
 */
export async function computeEta({ data }: { data: EtaInput }): Promise<EtaResult> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("qh_access_token") : null;
  const backendUrl = import.meta.env.VITE_API_URL || "";
  const res = await fetch(`${backendUrl}/api/eta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Failed to compute ETA");
  return json as EtaResult;
}
