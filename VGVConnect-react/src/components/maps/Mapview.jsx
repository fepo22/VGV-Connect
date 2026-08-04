import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const getDefaultIcon = () => {
  const iconUrl = new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href;
  const iconRetinaUrl = new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href;
  const shadowUrl = new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href;

  return L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

export default function MapView({ coordinates, onMapClick, selectedLocation, panTo }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const searchMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      center: coordinates.length ? [coordinates[0].lat, coordinates[0].lng] : [-33.45, -70.66],
      zoom: 12,
      layers: [
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
      ],
    });

    mapInstanceRef.current.on("click", (event) => {
      if (typeof onMapClick === "function") {
        onMapClick(event.latlng);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, onMapClick]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    } else {
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    const markersLayer = markersLayerRef.current;

    const validCoordinates = coordinates.filter((coord) => coord && coord.lat && coord.lng);
    if (validCoordinates.length) {
      const latlngs = validCoordinates.map(({ lat, lng }) => [lat, lng]);
      const bounds = L.latLngBounds(latlngs);

      validCoordinates.forEach((coord, index) => {
        L.marker([coord.lat, coord.lng], { icon: getDefaultIcon() })
          .bindPopup(`Parada ${index + 1}<br>${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`)
          .addTo(markersLayer);
      });

      L.polyline(latlngs, { color: "#1976D2", weight: 4, opacity: 0.8 }).addTo(markersLayer);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    if (selectedLocation) {
      L.marker([selectedLocation.lat, selectedLocation.lng], { icon: getDefaultIcon() })
        .bindPopup("Ubicación seleccionada")
        .addTo(markersLayer)
        .openPopup();
    }

    if (panTo && panTo.lat && panTo.lng) {
      map.setView([panTo.lat, panTo.lng], panTo.zoom || 16);
      if (searchMarkerRef.current) {
        try { map.removeLayer(searchMarkerRef.current); } catch (e) {}
        searchMarkerRef.current = null;
      }
      searchMarkerRef.current = L.marker([panTo.lat, panTo.lng], { icon: getDefaultIcon() }).addTo(markersLayer);
    }

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }
    };
  }, [coordinates, selectedLocation, panTo]);

  return <div ref={mapRef} style={{ height: "620px", width: "100%", marginTop: "20px", borderRadius: "16px" }} />;
}
