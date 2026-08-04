import http from "./http";

export const getVehicles = async () => {
  const response = await http.get("/vehicles");
  return response.data;
};
