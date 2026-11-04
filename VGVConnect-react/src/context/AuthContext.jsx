/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";
import { clearStoredSession, onPasswordChangeRequired, onSessionExpired, USER_KEY } from "../api/session";

// Crear el contexto
export const AuthContext = createContext();

// Crear el proveedor
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  });

  // Un 401 con el token vigente limpia el almacenamiento; RoleRoute redirige al login al quedar sin usuario.
  useEffect(() => onSessionExpired(() => setUser(null)), []);
  useEffect(() => onPasswordChangeRequired(() => setUser((current) => (current ? { ...current, mustChangePassword: true } : current))), []);

  const login = (userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };
  const logout = () => {
    clearStoredSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
