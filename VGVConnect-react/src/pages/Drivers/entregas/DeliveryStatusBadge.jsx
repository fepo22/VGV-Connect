export default function DeliveryStatusBadge({ value, onChange }) {
  return (
    <div style={styles.container}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.select}
      >
        <option value="">Seleccione estado</option>
        <option value="Entregado">Entregado</option>
        <option value="Rechazado">Rechazado</option>
        <option value="Parcial">Parcial</option>
      </select>
    </div>
  );
}

const styles = {
  container: {
    marginTop: "5px",
  },
  select: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    width: "100%",
    fontSize: "16px",
  },
};
