export default function RouteList({ routes, selectedId, onSelect }) {
  if (!routes || routes.length === 0) {
    return <p className="route-empty">No hay rutas creadas.</p>;
  }

  return (
    <div className="route-list">
      {routes.map((route) => (
        <button
          className={`route-row ${selectedId === route.id ? "is-selected" : ""}`}
          key={route.id}
          onClick={() => onSelect(route)}
          type="button"
        >
          <span className="route-row-main">
            <strong>{route.name}</strong>
            <small>{route.date} · {route.stopCount} paradas</small>
          </span>
          <span className={`route-status route-status-${route.status}`}>{route.status}</span>
        </button>
      ))}
    </div>
  );
}
