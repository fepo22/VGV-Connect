import http from "./http";
import { storeToken } from "./session";

export const loginUser = async (identifier, password) => {
  const { data } = await http.post("/auth/login", { identifier, password });
  storeToken(data.token);
  return data.user;
};

// El backend revoca los tokens anteriores y devuelve uno nuevo para este dispositivo.
export const changeOwnPassword = async (currentPassword, newPassword) => {
  const { data } = await http.post("/auth/change-password", { currentPassword, newPassword });
  storeToken(data.token);
  return data.user;
};
