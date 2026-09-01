import http from "./http";

export const getDriversOverview = () => http.get("/drivers/overview");
export const getDrivers = () => http.get("/drivers");
export const createDriver = (data) => http.post("/drivers", data);
export const updateDriver = (id, data) => http.put(`/drivers/${id}`, data);
export const deleteDriver = (id) => http.delete(`/drivers/${id}`);