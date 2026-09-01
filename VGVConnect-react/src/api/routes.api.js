import http from "./http";

export const getRoutes = (options) => {
	const params = typeof options === "object" ? options : options ? { driverId: options } : undefined;
	return http.get("/routes", { params });
};

export const createRoute = (payload) => http.post("/routes", payload);

export const updateRoute = (id, payload) => http.put(`/routes/${id}`, payload);

export const deleteRoute = (id) => http.delete(`/routes/${id}`);

export const optimizeRoute = (id) => http.post(`/routes/${id}/optimize`);
