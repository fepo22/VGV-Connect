import http from "./http";

export const getDeliveries = (driverId) =>
  http.get("/deliveries", { params: driverId ? { driverId } : undefined });
