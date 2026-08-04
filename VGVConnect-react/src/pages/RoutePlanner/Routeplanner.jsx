import React, { useState, useEffect } from "react";
import RouteList from "../components/deliveries/RouteList";
import MapView from "../components/maps/MapView";
import DeliveryDetail from "../components/deliveries/DeliveryDetail";
import { optimizeRoute } from "../api/routes";

export default function Routeplanner() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [coordinates, setCoordinates] = useState([]);

  useEffect(() => {
    // Traer rutas del backend (ejemplo con driverId=123)
    fetch("/api/routes/driver/123")
      .then((res) => res.json())
      .then((data) => setRoutes(data));
  }, []);

  const handleOptimize = async () => {
    const optimized = await optimizeRoute(123);
    setRoutes(optimized.routes);
    setCoordinates(optimized.coordinates);
  };

  return (
    <div className="route-planner-page">
      <h1>📍 Route Planner</h1>
      <RouteList
        routes={routes}
        onOptimize={handleOptimize}
        onSelect={(r) => setSelectedRoute(r)}
      />
      <MapView coordinates={coordinates} />
      {selectedRoute && (
        <DeliveryDetail
          route={selectedRoute}
          onClose={() => setSelectedRoute(null)}
        />
      )}
    </div>
  );
}
