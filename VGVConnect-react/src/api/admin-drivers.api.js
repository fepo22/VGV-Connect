import http from "./http";

export const getDriversOverview = () => http.get("/drivers/overview");