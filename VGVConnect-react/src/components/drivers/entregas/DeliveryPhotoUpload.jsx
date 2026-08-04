export default function DeliveryPhotoUpload({ onPhotoTaken }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onPhotoTaken(url);
    }
  };

  return (
    <div className="photo-upload">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
      />
    </div>
  );
}
