export default function DeliveryStatusBadge({ value, onChange }) {
  return (
    <div className="status-selector">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Seleccione</option>
        <option value="Entregado">Entregado</option>
        <option value="Rechazado">Rechazado</option>
        <option value="Parcial">Parcial</option>
      </select>
    </div>
  );
}
