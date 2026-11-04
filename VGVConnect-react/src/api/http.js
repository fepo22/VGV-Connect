import axios from "axios";
import { getStoredToken, handlePasswordChangeRequired, handleUnauthorized } from "./session";

const LOGIN_PATH = "/auth/login";
const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:4000" : "";

const http = axios.create({
  baseURL: configuredApiUrl || fallbackApiUrl,
});

http.interceptors.request.use((config) => {
  if (!configuredApiUrl && !import.meta.env.DEV) {
    throw new Error("VITE_API_URL no esta configurada para produccion");
  }
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(undefined, (error) => {
  const { response, config } = error;
  const header = config?.headers?.Authorization;
  const sentToken = typeof header === "string" ? header.replace(/^Bearer\s+/, "") : null;
  // El 401 del login son credenciales inválidas y lo muestra LoginPage; 403 y 5xx no cierran sesión.
  if (response?.status === 401 && config?.url !== LOGIN_PATH) {
    handleUnauthorized(sentToken);
  } else if (response?.status === 403 && response.data?.code === PASSWORD_CHANGE_REQUIRED) {
    handlePasswordChangeRequired(sentToken);
  }
  return Promise.reject(error);
});

export default http;
