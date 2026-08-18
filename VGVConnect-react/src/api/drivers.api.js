import http from "./http";

export const getDriverDeliveries = (driverId) =>
  http.get("/deliveries", { params: { driverId } });

export const registrarEntregaDriver = (id, data) =>
  http.put(`/deliveries/${id}/status`, data);

export const uploadDeliveryPhotoDriver = (id, photoData) =>
  http.post(`/deliveries/${id}/photo`, { photoData });
