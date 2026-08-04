import React from "react";

export default function RouteList({ routes, onOptimize, onSelect }) {
  if (!routes || routes.length === 0) {
    return <p>No hay rutas asignadas.</p>;
  }

  return (
    <div>
      <h2>Mis Rutas</h2>
      <button onClick={onOptimize}>Optimizar Ruta</button>
      <ul>
        {routes.map((route) => (
          <li key={route.id} style={{ margin: "10px 0" }}>
            <strong>{route.address}</strong> — {route.status}
            <br />
            <button onClick={() => onSelect(route)}>Registrar entrega</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
