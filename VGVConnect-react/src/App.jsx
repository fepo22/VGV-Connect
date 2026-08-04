import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/Login/LoginPage";
import DeliveriesPage from "./pages/Deliveries/DeliveriesPage";
import Dashboard from "./pages/Dashboard/Dashboard";
import Rutas from "./pages/Rutas/Rutas";
import RutasChofer from "./pages/Drivers/rutas/RutasChofer";
import Reportes from "./pages/Reportes/Reportes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login sin layout */}
        <Route path="/" element={<LoginPage />} />

        {/* Rutas protegidas con layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entregas" element={<DeliveriesPage />} />
          <Route path="/rutas" element={<Rutas />} />
          <Route path="/rutas/choferes" element={<RutasChofer />} />
          <Route path="/reportes" element={<Reportes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
