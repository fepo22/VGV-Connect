import DeliveryStatusBadge from "./DeliveryStatusBadge";
import DeliveryPhotoUpload from "./DeliveryPhotoUpload";

export default function DeliveryDetail({ delivery, onConfirm }) {
  const handlePhoto = async (file) => {
    onConfirm(file);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>{delivery.client}</h2>
      <p>{delivery.address}</p>

      <DeliveryStatusBadge status={delivery.status} />

      <h4 style={{ marginTop: "20px" }}>Subir foto de entrega</h4>
      <DeliveryPhotoUpload onPhotoSelected={handlePhoto} />
    </div>
  );
}
