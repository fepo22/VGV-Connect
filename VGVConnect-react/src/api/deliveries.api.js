import http from "./http";

export const getDeliveries = () => http.get("/deliveries");

export const updateDeliveryStatus = (id, status) =>
  http.put(`/deliveries/${id}/status`, { status });

export const uploadDeliveryPhoto = (formData) =>
  http.post("/deliveries/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const createDeliveryReport = (data) =>
  http.post("/deliveries/report", data);
