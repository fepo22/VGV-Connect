import { Link } from "react-router-dom";

export default function DeliverySuccess() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Entrega registrada</h2>
        <p style={styles.text}>
          La entrega fue registrada correctamente en el sistema.
        </p>

        <Link to="/drivers">
          <button style={styles.button}>Volver al panel</button>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "80vh",
  },
  card: {
    background: "#fff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center",
    width: "90%",
    maxWidth: 400,
  },
  title: {
    marginBottom: 10,
    fontSize: 24,
    fontWeight: "bold",
  },
  text: {
    marginBottom: 20,
    fontSize: 16,
    color: "#555",
  },
  button: {
    padding: "10px 20px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
  },
};
