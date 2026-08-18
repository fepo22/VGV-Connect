const geocodeUrl = "https://nominatim.openstreetmap.org/search";

export const geocodeAddress = async (address) => {
  if (!address?.trim()) return null;

  const params = new URLSearchParams({
    q: `${address}, Chile`,
    format: "jsonv2",
    limit: "1",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${geocodeUrl}?${params}`, {
      headers: { "User-Agent": "VGV-Connect/1.0 route-planner" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const [result] = await response.json();
    return result ? { lat: Number(result.lat), lng: Number(result.lon), source: "nominatim" } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
