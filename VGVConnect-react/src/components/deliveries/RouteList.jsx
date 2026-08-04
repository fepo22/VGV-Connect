import React from "react";

export default function RouteList({ routes, onOptimize, onSelect }) {
  if (!routes || routes.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "16px",
          boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
          marginTop: "24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <p style={{ margin: 0, color: "#555" }}>No hay rutas programadas.</p>
        <button
          onClick={onOptimize}
          style={{
            marginTop: "16px",
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            background: "#2d88ff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Programar rutas
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0 }}>Planificación de ruta</h2>
        <button
          onClick={onOptimize}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            background: "#2d88ff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Optimizar ruta
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {routes.map((route) => (
          <li
            key={route.id}
            style={{
              marginBottom: "18px",
              padding: "18px",
              borderRadius: "16px",
              boxShadow: "0 3px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #edf0f4",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: "700", fontSize: "1rem", color: "#111" }}>
                    #{route.reference} · {route.sequence}. {route.client}
                  </p>
                  <p style={{ margin: 0, color: "#555", fontSize: "0.95rem", lineHeight: 1.5 }}>
                    <strong>Chofer:</strong> {route.driver} · <strong>Patente:</strong> {route.vehicle}
                  </p>
                </div>
                <button
                  onClick={() => onSelect(route)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#2d88ff",
                    color: "#fff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Ver detalle
                </button>
              </div>

              <div style={{ display: "grid", gap: "8px", color: "#555" }}>
                <p style={{ margin: 0 }}>
                  <strong>Geo:</strong> {route.geoPoint}
                </p>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#777" }}>
                  {route.address} · ETA: {route.eta}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
