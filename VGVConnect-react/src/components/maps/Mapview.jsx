import React, { useEffect } from "react";

export default function MapView({ coordinates }) {
  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    // Ejemplo con Google Maps
    const map = new window.google.maps.Map(document.getElementById("map"), {
      zoom: 12,
      center: coordinates[0], // primer punto como centro
    });

    coordinates.forEach((coord) => {
      new window.google.maps.Marker({
        position: coord,
        map,
      });
    });

    // Dibujar ruta
    const path = new window.google.maps.Polyline({
      path: coordinates,
      geodesic: true,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });
    path.setMap(map);
  }, [coordinates]);

  return <div id="map" style={{ height: "400px", marginTop: "20px" }} />;
}
