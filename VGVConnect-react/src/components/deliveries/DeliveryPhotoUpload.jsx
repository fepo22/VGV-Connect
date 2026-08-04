export default function DeliveryPhotoUpload({ onPhotoSelected }) {
  return (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(e) => onPhotoSelected(e.target.files[0])}
      style={{ marginTop: "10px" }}
    />
  );
}
