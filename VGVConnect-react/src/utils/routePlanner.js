export const normalizeRouteStops = (stops = []) =>
  (Array.isArray(stops) ? stops : []).map((stop) => ({
    id: stop.id ?? null,
    client: stop.client || stop.clientName || "Punto de descarga",
    address: stop.address || stop.direccion || "",
    guideNumber: stop.guideNumber || "",
    status: stop.status || "pending",
  }));

export const buildRouteFormState = (route, fallbackDate) => ({
  date: route?.date || fallbackDate,
  startTime: route?.startTime || "08:00",
  origin: route?.origin || "",
  destination: route?.destination || "",
  driverId: route?.driverId ? String(route.driverId) : "",
  vehicleId: route?.vehicleId ? String(route.vehicleId) : "",
  weightKg: route?.weightKg || "",
  volumeM3: route?.volumeM3 || "",
  deliveryDate: route?.deliveryDate || "",
  stops: normalizeRouteStops(route?.stops || []),
});

const normalizeForm = (form) => ({
  ...form,
  stops: normalizeRouteStops(form?.stops).map((stop) => ({
    ...stop,
    client: stop.client.trim(),
    address: stop.address.trim(),
    guideNumber: stop.guideNumber.trim(),
  })),
});

export const hasRouteChanges = (route, form, fallbackDate) =>
  JSON.stringify(normalizeForm(buildRouteFormState(route, fallbackDate)))
  !== JSON.stringify(normalizeForm(form));

export const mergeRouteFormState = (previousRoute, refreshedRoute, localForm, fallbackDate) => {
  const previous = buildRouteFormState(previousRoute, fallbackDate);
  const refreshed = buildRouteFormState(refreshedRoute, fallbackDate);
  const local = normalizeForm(localForm);
  const merged = { ...refreshed };

  for (const field of ["date", "startTime", "origin", "destination", "driverId", "vehicleId", "weightKg", "volumeM3", "deliveryDate"]) {
    if (local[field] !== previous[field]) merged[field] = local[field];
  }

  const previousById = new Map(previous.stops.filter((stop) => stop.id != null).map((stop) => [String(stop.id), stop]));
  const refreshedById = new Map(refreshed.stops.filter((stop) => stop.id != null).map((stop) => [String(stop.id), stop]));
  const localIds = new Set(local.stops.filter((stop) => stop.id != null).map((stop) => String(stop.id)));
  merged.stops = local.stops.map((localStop) => {
    if (localStop.id == null) return localStop;
    const key = String(localStop.id);
    const previousStop = previousById.get(key);
    const refreshedStop = refreshedById.get(key);
    if (!previousStop) return localStop;
    if (!refreshedStop) {
      const unchanged = Object.keys(previousStop).every((field) => localStop[field] === previousStop[field]);
      return unchanged ? null : localStop;
    }
    return Object.fromEntries(Object.keys(refreshedStop).map((field) => [
      field,
      localStop[field] === previousStop[field] ? refreshedStop[field] : localStop[field],
    ]));
  }).filter(Boolean);

  for (const refreshedStop of refreshed.stops) {
    if (refreshedStop.id != null && !previousById.has(String(refreshedStop.id)) && !localIds.has(String(refreshedStop.id))) {
      merged.stops.push(refreshedStop);
    }
  }
  return merged;
};

export const groupRouteStops = (stops, defaultClient) => {
  const groups = new Map();
  for (const stop of stops) {
    const client = stop.client || defaultClient;
    const address = stop.address || "Sin dirección";
    const key = `${client}::${address}`;
    const group = groups.get(key) || { id: key, client, address, documents: [], stops: [] };
    group.stops.push(stop);
    if (stop.guideNumber) group.documents.push(stop.guideNumber);
    groups.set(key, group);
  }
  return Array.from(groups.values()).map((group, index) => {
    const statuses = new Set(group.stops.map((stop) => stop.status || "pending"));
    return {
      ...group,
      sequence: index + 1,
      documents: [...new Set(group.documents)],
      status: statuses.size === 1 ? statuses.values().next().value : "mixed",
    };
  });
};
