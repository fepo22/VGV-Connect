import { useState } from "react";
import DeliveryPhotoUpload from "./DeliveryPhotoUpload";
import DeliveryStatusBadge from "./DeliveryStatusBadge";

export default function DeliveryForm({ onSubmit }) {
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [estado, setEstado] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const handleSubmit = () => {
    if (!tipoDocumento || !numeroDocumento || !estado || !photoUrl) {
      alert("Completa todos los campos antes de continuar");
      return;
    }

    onSubmit({
      tipoDocumento,
      numeroDocumento,
      estado,
      photoUrl,
    });
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>Tipo de documento</label>
      <select
        style={styles.select}
        value={tipoDocumento}
        onChange={(e) => setTipoDocumento(e.target.value)}
      >
        <option value="">Seleccione</option>
        <option value="Guía">Guía</option>
        <option value="Factura">Factura</option>
        <option value="Orden de compra">Orden de compra</option>
      </select>

      <label style={styles.label}>Número del documento</label>
      <input
        type="text"
        style={styles.input}
        value={numeroDocumento}
        onChange={(e) => setNumeroDocumento(e.target.value)}
        placeholder="Ej: 123456"
      />

      <label style={styles.label}>Foto del documento</label>
      <DeliveryPhotoUpload onPhotoTaken={setPhotoUrl} />

      {photoUrl && (
        <img
          src={photoUrl}
          alt="preview"
          style={styles.preview}
        />
      )}

      <label style={styles.label}>Estado de recepción</label>
      <DeliveryStatusBadge value={estado} onChange={setEstado} />

      <button style={styles.button} onClick={handleSubmit}>
        Registrar entrega
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "10px",
  },
  label: {
    fontWeight: "bold",
    marginTop: "10px",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  select: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  preview: {
    width: "200px",
    marginTop: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  button: {
    marginTop: "20px",
    padding: "12px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
};
