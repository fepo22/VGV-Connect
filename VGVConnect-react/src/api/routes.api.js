import http from "./http";

export const getRoutes = (driverId) =>
	http.get("/routes", { params: driverId ? { driverId } : undefined });

export const createRoute = (payload) => http.post("/routes", payload);

export const updateRoute = (id, payload) => http.put(`/routes/${id}`, payload);

export const optimizeRoute = (id) => http.post(`/routes/${id}/optimize`);
