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
      alert("Completa todos los campos");
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
    <div className="delivery-form">

      <label>Tipo de documento</label>
      <select
        value={tipoDocumento}
        onChange={(e) => setTipoDocumento(e.target.value)}
      >
        <option value="">Seleccione</option>
        <option value="Guía">Guía</option>
        <option value="Factura">Factura</option>
        <option value="Orden de compra">Orden de compra</option>
      </select>

      <label>Número del documento</label>
      <input
        type="text"
        value={numeroDocumento}
        onChange={(e) => setNumeroDocumento(e.target.value)}
        placeholder="Ej: 123456"
      />

      <label>Foto del documento</label>
      <DeliveryPhotoUpload onPhotoTaken={setPhotoUrl} />

      {photoUrl && (
        <img
          src={photoUrl}
          alt="preview"
          width={200}
          style={{ marginTop: "10px", borderRadius: "8px" }}
        />
      )}

      <label>Estado de recepción</label>
      <DeliveryStatusBadge value={estado} onChange={setEstado} />

      <button onClick={handleSubmit} className="btn-primary">
        Registrar entrega
      </button>
    </div>
  );
}
