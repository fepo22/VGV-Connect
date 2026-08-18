import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:4000" : "";

const http = axios.create({
  baseURL: configuredApiUrl || fallbackApiUrl,
});

http.interceptors.request.use((config) => {
  if (!configuredApiUrl && !import.meta.env.DEV) {
    throw new Error("VITE_API_URL no esta configurada para produccion");
  }
  const token = localStorage.getItem("vgv-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
