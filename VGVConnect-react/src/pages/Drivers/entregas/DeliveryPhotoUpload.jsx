export default function DeliveryPhotoUpload({ onPhotoTaken }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Crea una URL temporal para previsualizar la foto
    const url = URL.createObjectURL(file);

    // Envía la URL al componente padre (DeliveryForm)
    onPhotoTaken(url);
  };

  return (
    <div style={styles.container}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={styles.input}
      />
    </div>
  );
}

const styles = {
  container: {
    marginTop: "10px",
  },
  input: {
    padding: "10px 0",
  },
};
