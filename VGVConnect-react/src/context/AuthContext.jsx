/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";

// Crear el contexto
export const AuthContext = createContext();

// Crear el proveedor
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vgv-user")) || null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    localStorage.setItem("vgv-user", JSON.stringify(userData));
    setUser(userData);
  };
  const logout = () => {
    localStorage.removeItem("vgv-user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
