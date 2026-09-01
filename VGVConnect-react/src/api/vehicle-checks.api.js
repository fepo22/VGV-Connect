import http from "./http";

export const getVehicleChecks = (params) => http.get("/vehicle-checks", { params });

export const saveVehicleCheck = (payload) => http.post("/vehicle-checks", payload);
