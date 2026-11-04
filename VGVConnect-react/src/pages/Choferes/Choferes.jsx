import { useEffect, useState } from "react";
import { getDrivers } from "../../api/drivers.api";
import { useToast } from "../../components/ui/toast-context";

export default function Choferes() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getDrivers();
        setDrivers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching drivers", error);
        addToast("Error cargando choferes", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Choferes disponibles</h1>
      <p style={{ marginBottom: 20 }}>Lista de choferes actualmente registrados en el sistema.</p>

      {loading ? (
        <div>Cargando choferes...</div>
      ) : drivers.length === 0 ? (
        <div>No hay choferes disponibles.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {drivers.map((driver) => (
            <div
              key={driver.id}
              style={{
                padding: 14,
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>{driver.name}</div>
              <div style={{ color: "#475569", marginTop: 6 }}>
                ID: {driver.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
