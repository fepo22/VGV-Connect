import axios from "axios";

const http = axios.create({
  baseURL: "http://localhost:4000", // luego lo cambiamos a producción
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("vgv-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
