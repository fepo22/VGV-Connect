import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/Login/LoginPage";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import DeliveriesPage from "./pages/Deliveries/DeliveriesPage";
import RoutePlanner from "./pages/RoutePlanner/Routeplanner";
import Reportes from "./pages/Reportes/Reportes";
import DashboardChofer from "./pages/Drivers/DashboardChofer";
import CheckVehiculo from "./pages/Drivers/CheckVehiculo";
import RegistrarEntrega from "./pages/Drivers/entregas/RegistrarEntrega";
import DriversOverview from "./pages/Drivers/DriversOverview";
import ChangePasswordPage from "./pages/Account/ChangePasswordPage";
import useAuth from "./hooks/useAuth";

const CHANGE_PASSWORD_PATH = "/cambiar-contrasena";

function RedirectToLogin() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    // StrictMode repite los efectos en desarrollo; la referencia garantiza una sola redirección.
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  return user && roles.includes(user.role) ? children : <RedirectToLogin />;
}

function AuthenticatedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <RedirectToLogin />;
}

const roleHome = {
  admin: "/dashboard",
  route_planner: "/rutas",
  billing: "/reportes",
  driver: "/conductor",
};

function RoleHome() {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  return <Navigate to={roleHome[user?.role] || "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path={CHANGE_PASSWORD_PATH} element={<AuthenticatedRoute><ChangePasswordPage roleHome={roleHome} /></AuthenticatedRoute>} />
          <Route path="/home" element={<RoleRoute roles={["admin", "route_planner", "billing"]}><Home /></RoleRoute>} />
          <Route path="/inicio" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard" element={<RoleRoute roles={["admin", "route_planner", "billing"]}><Dashboard /></RoleRoute>} />
          <Route path="/entregas" element={<RoleRoute roles={["admin", "route_planner", "billing"]}><DeliveriesPage /></RoleRoute>} />
          <Route path="/rutas" element={<RoleRoute roles={["admin", "route_planner"]}><RoutePlanner routeType="all" /></RoleRoute>} />
          <Route path="/rutas/entregas" element={<RoleRoute roles={["admin", "route_planner"]}><RoutePlanner routeType="delivery" /></RoleRoute>} />
          <Route path="/rutas/retiros" element={<RoleRoute roles={["admin", "route_planner"]}><RoutePlanner routeType="pickup" /></RoleRoute>} />
          <Route path="/routeplanner" element={<Navigate to="/rutas" replace />} />
          <Route path="/choferes" element={<RoleRoute roles={["admin", "route_planner"]}><DriversOverview /></RoleRoute>} />
          <Route path="/reportes" element={<RoleRoute roles={["admin", "billing"]}><Reportes /></RoleRoute>} />
          <Route path="/conductor" element={<RoleRoute roles={["driver"]}><DashboardChofer /></RoleRoute>} />
          <Route path="/conductor/check-vehiculo" element={<RoleRoute roles={["driver"]}><CheckVehiculo /></RoleRoute>} />
          <Route path="/conductor/entregas/:id" element={<RoleRoute roles={["driver"]}><RegistrarEntrega /></RoleRoute>} />
          <Route path="/chofer" element={<Navigate to="/conductor" replace />} />
          <Route path="/chofer/check-vehiculo" element={<Navigate to="/conductor/check-vehiculo" replace />} />
          <Route path="/chofer/entregas/:id" element={<RoleRoute roles={["driver"]}><RegistrarEntrega /></RoleRoute>} />
        </Route>
        <Route path="*" element={<RoleHome />} />
      </Routes>
    </BrowserRouter>
  );
}
