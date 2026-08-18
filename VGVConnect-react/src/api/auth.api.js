import http from "./http";

export const loginUser = async (identifier, password) => {
  const { data } = await http.post("/auth/login", { identifier, password });
  localStorage.setItem("vgv-token", data.token);
  return data.user;
};
