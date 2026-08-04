import React, { useEffect, useState, useMemo } from "react";
import { getOrders } from "../../api/orders.api";
import { getDrivers } from "../../api/drivers.api";
import { useToast } from "../../components/ui/ToastContext";

export default function Reportes() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState({ driverId: "", status: "", from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [o, d] = await Promise.all([getOrders(), getDrivers()]);
        setOrders(Array.isArray(o) ? o : []);
        setDrivers(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("Error loading report data", e);
        toast.addToast("Error cargando datos de reportes", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter.driverId && Number(filter.driverId) !== Number(o.driverId)) return false;
      if (filter.status && o.status !== filter.status) return false;
      if (filter.from) {
        const from = new Date(filter.from);
        const sched = o.scheduledAt ? new Date(o.scheduledAt) : null;
        if (!sched || sched < from) return false;
      }
      if (filter.to) {
        const to = new Date(filter.to);
        const sched = o.scheduledAt ? new Date(o.scheduledAt) : null;
        if (!sched || sched > to) return false;
      }
      return true;
    });
  }, [orders, filter]);

  const totals = useMemo(() => {
    const total = filtered.length;
    const delivered = filtered.filter((o) => o.status === "delivered").length;
    const inRoute = filtered.filter((o) => o.status === "in_route").length;
    const planned = filtered.filter((o) => o.status === "planned").length;
    return { total, delivered, inRoute, planned };
  }, [filtered]);

  const exportCSV = () => {
    if (!filtered || filtered.length === 0) {
      toast.addToast("No hay datos para exportar", "error");
      return;
    }
    const keys = ["id", "reference", "driverId", "driverName", "clientName", "address", "scheduledAt", "status"];
    const lines = [];
    lines.push(keys.join(","));
    filtered.forEach((o) => {
      const row = [
        o.id,
        `"${String(o.reference || "").replace(/"/g, '""')}"`,
        o.driverId || "",
        `"${(o.driver && o.driver.name) || ""}"`,
        `"${(o.client && o.client.name) || o.clientName || ""}"`,
        `"${(o.address && (o.address.label || o.address.street)) || ""}"`,
        o.scheduledAt || "",
        o.status || "",
      ];
      lines.push(row.join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reportes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.addToast("CSV descargado", "info");
  };

  const StatsChart = ({ totals }) => {
    const items = [
      { key: "delivered", label: "Entregadas", value: totals.delivered, color: "#16a34a" },
      { key: "inRoute", label: "En ruta", value: totals.inRoute, color: "#f59e0b" },
      { key: "planned", label: "Planificadas", value: totals.planned, color: "#2563eb" },
    ];
    const max = Math.max(1, ...items.map((i) => i.value));
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "end", height: 100 }}>
        {items.map((it) => (
          <div key={it.key} style={{ textAlign: "center" }}>
            <div style={{ height: `${(it.value / max) * 80}px`, width: 36, background: it.color, borderRadius: 6, marginBottom: 6 }} />
            <div style={{ fontSize: 12 }}>{it.label}</div>
            <div style={{ fontWeight: 700 }}>{it.value}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <h1>Reportes</h1>

      <section style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <label>Chofer</label>
          <select value={filter.driverId} onChange={(e) => setFilter((f) => ({ ...f, driverId: e.target.value }))}>
            <option value="">-- todos --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Estado</label>
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">-- todos --</option>
            <option value="planned">Planned</option>
            <option value="in_route">In Route</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label>Desde</label>
          <input type="date" value={filter.from} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))} />
        </div>

        <div>
          <label>Hasta</label>
          <input type="date" value={filter.to} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))} />
        </div>

        <div style={{ alignSelf: "end" }}>
          <button onClick={() => setFilter({ driverId: "", status: "", from: "", to: "" })}>Limpiar</button>
        </div>
      </section>

      <section style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ padding: 12, background: "#fff", borderRadius: 10 }}>
          <strong>Total</strong>
          <div style={{ fontSize: 20 }}>{totals.total}</div>
        </div>
        <div style={{ padding: 12, background: "#fff", borderRadius: 10 }}>
          <strong>Entregadas</strong>
          <div style={{ fontSize: 20, color: "green" }}>{totals.delivered}</div>
        </div>
        <div style={{ padding: 12, background: "#fff", borderRadius: 10 }}>
          <strong>En ruta</strong>
          <div style={{ fontSize: 20 }}>{totals.inRoute}</div>
        </div>
        <div style={{ padding: 12, background: "#fff", borderRadius: 10 }}>
          <strong>Planificadas</strong>
          <div style={{ fontSize: 20 }}>{totals.planned}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <StatsChart totals={totals} />
          <div>
            <button onClick={exportCSV} style={{ display: "block", marginBottom: 8 }}>Export CSV</button>
            <button onClick={() => toast.addToast("Exportar gráficos próximamente", "info")}>Export Chart (png)</button>
          </div>
        </div>
      </section>

      <section style={{ background: "#fff", borderRadius: 8, padding: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Ref</th>
              <th style={{ textAlign: "left", padding: 8 }}>Chofer</th>
              <th style={{ textAlign: "left", padding: 8 }}>Cliente</th>
              <th style={{ textAlign: "left", padding: 8 }}>Horario</th>
              <th style={{ textAlign: "left", padding: 8 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 12 }}>
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 12 }}>
                  No hay resultados.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{o.reference}</td>
                  <td style={{ padding: 8 }}>{o.driver?.name || "-"}</td>
                  <td style={{ padding: 8 }}>{o.client?.name || o.clientName || "-"}</td>
                  <td style={{ padding: 8 }}>{o.scheduledAt ? new Date(o.scheduledAt).toLocaleString() : "-"}</td>
                  <td style={{ padding: 8 }}>{o.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );

