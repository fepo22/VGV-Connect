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
import useAuth from "./hooks/useAuth";

function DriverRoute({ children }) {
  const { user } = useAuth();
  return user?.role === "driver" ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/inicio" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entregas" element={<DeliveriesPage />} />
          <Route path="/rutas" element={<RoutePlanner />} />
          <Route path="/routeplanner" element={<Navigate to="/rutas" replace />} />
          <Route path="/choferes" element={<Home />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/chofer" element={<DriverRoute><DashboardChofer /></DriverRoute>} />
          <Route path="/chofer/entregas/:id" element={<DriverRoute><RegistrarEntrega /></DriverRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
