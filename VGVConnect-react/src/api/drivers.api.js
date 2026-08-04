import http from "./http";

export const getDrivers = async () => {
  const response = await http.get("/drivers");
  return response.data;
};
