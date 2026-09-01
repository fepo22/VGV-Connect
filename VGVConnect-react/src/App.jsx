import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/Login/LoginPage";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import DeliveriesPage from "./pages/Deliveries/DeliveriesPage";
import RoutePlanner from "./pages/RoutePlanner/Routeplanner";
import Reportes from "./pages/Reportes/Reportes";
import DashboardChofer from "./pages/Drivers/DashboardChofer";
import RegistrarEntrega from "./pages/Drivers/entregas/RegistrarEntrega";
import DriversOverview from "./pages/Drivers/DriversOverview";
import useAuth from "./hooks/useAuth";

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

const roleHome = {
  admin: "/dashboard",
  route_planner: "/rutas",
  billing: "/reportes",
  driver: "/chofer",
};

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={roleHome[user?.role] || "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout />}>
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
          <Route path="/chofer" element={<RoleRoute roles={["driver"]}><DashboardChofer /></RoleRoute>} />
          <Route path="/chofer/entregas/:id" element={<RoleRoute roles={["driver"]}><RegistrarEntrega /></RoleRoute>} />
        </Route>
        <Route path="*" element={<RoleHome />} />
      </Routes>
    </BrowserRouter>
  );
}
