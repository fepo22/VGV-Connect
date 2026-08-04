import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/Login/LoginPage";
import DeliveriesPage from "./pages/Deliveries/DeliveriesPage";
import Dashboard from "./pages/Dashboard/Dashboard";
import RoutePlanner from "./pages/RoutePlanner/Routeplanner"; // importa tu página con mayúscula

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
          <Route path="/routeplanner" element={<RoutePlanner />} /> {/* nueva ruta */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
