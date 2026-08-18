import DeliveryCard from "./DeliveryCard";

export default function DeliveryList({ deliveries }) {
  if (deliveries.length === 0)
    return <p className="delivery-empty">No hay entregas que coincidan con los filtros.</p>;

  return (
    <div className="delivery-admin-list">
      <table>
        <thead><tr><th>Documento</th><th>Destino</th><th>Ruta y chofer</th><th>Estado</th><th>Evidencia y seguimiento</th></tr></thead>
        <tbody>{deliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} />)}</tbody>
      </table>
    </div>
  );
}
