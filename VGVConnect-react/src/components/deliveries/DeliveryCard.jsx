import DeliveryStatusBadge from "./DeliveryStatusBadge";

export default function DeliveryCard({ delivery }) {
  const status = delivery.estado || delivery.status;
  const client = delivery.cliente || delivery.client || "Cliente sin nombre";
  const address = delivery.direccion || delivery.address || "Dirección no disponible";
  const route = delivery.route;
  const locationUrl = delivery.location ? `https://www.google.com/maps?q=${delivery.location.lat},${delivery.location.lng}` : null;
  const completedAt = delivery.deliveredAt ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(delivery.deliveredAt)) : null;

  return (
    <tr className="delivery-admin-row">
      <td data-label="Documento"><strong>{delivery.guideNumber || "Sin guía"}</strong><small>{route?.documentType === "invoice" ? "Factura" : "Guía de despacho"}</small></td>
      <td data-label="Destino"><strong>{client}</strong><small>{address}</small></td>
      <td data-label="Ruta y chofer"><strong>{route?.documentNumber || (route ? `Ruta #${route.id}` : "Sin ruta")}</strong><small>{delivery.driverName || "Sin chofer asignado"}</small></td>
      <td data-label="Estado"><DeliveryStatusBadge status={status} />{completedAt && <small>Registrada: {completedAt}</small>}</td>
      <td data-label="Evidencia y seguimiento" className="delivery-admin-actions">{delivery.photoUrl ? <a href={delivery.photoUrl} target="_blank" rel="noreferrer">Ver evidencia</a> : <span>Sin foto</span>}{locationUrl ? <a href={locationUrl} target="_blank" rel="noreferrer">Ver ubicación</a> : <span>Sin ubicación</span>}{delivery.observations && <small className="delivery-admin-note">{delivery.observations}</small>}</td>
    </tr>
  );
}
