import React, { useEffect, useState } from "react";
import { getDrivers } from "../../../api/drivers.api";
import { getOrdersByDriver, updateOrderStatus } from "../../../api/orders.api";
import { useToast } from "../../../components/ui/ToastContext";

export default function RutasChofer() {
	const [drivers, setDrivers] = useState([]);
	const [selectedDriver, setSelectedDriver] = useState(null);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const d = await getDrivers();
				setDrivers(d || []);
			} catch (e) {
				console.error("Error fetching drivers", e);
			}
		})();
	}, []);

	useEffect(() => {
		if (!selectedDriver) return setOrders([]);
		(async () => {
			setLoading(true);
			try {
				const data = await getOrdersByDriver(selectedDriver.id);
				setOrders(data || []);
			} catch (e) {
				console.error("Error fetching driver orders", e);
				setOrders([]);
			} finally {
				setLoading(false);
			}
		})();
	}, [selectedDriver]);

	const toast = useToast();

	const handleConfirm = async (orderId) => {
		try {
			const updated = await updateOrderStatus(orderId, "delivered", { deliveredBy: null });
			setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
			toast.addToast("Entrega confirmada", "info");
		} catch (e) {
			console.error("Error confirming delivery", e);
			toast.addToast(e?.response?.data?.message || "Error confirming entrega", "error");
		}
	};

	return (
		<div style={{ padding: 16 }}>
			<h2>Hoja de Ruta - Chofer</h2>
			<div style={{ marginBottom: 12 }}>
				<label>Chofer: </label>
				<select
					value={selectedDriver ? selectedDriver.id : ""}
					onChange={(e) => {
						const id = Number(e.target.value);
						const d = drivers.find((x) => x.id === id) || null;
						setSelectedDriver(d);
					}}
				>
					<option value="">-- seleccionar --</option>
					{drivers.map((d) => (
						<option key={d.id} value={d.id}>
							{d.name}
						</option>
					))}
				</select>
			</div>

			{loading ? (
				<div>Cargando órdenes...</div>
			) : (
				<div>
					{orders.length === 0 ? (
						<div>No hay órdenes para este chofer.</div>
					) : (
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr>
									<th style={{ textAlign: "left", padding: 8 }}>Referencia</th>
									<th style={{ textAlign: "left", padding: 8 }}>Cliente</th>
									<th style={{ textAlign: "left", padding: 8 }}>Dirección</th>
									<th style={{ textAlign: "left", padding: 8 }}>Horario</th>
									<th style={{ textAlign: "left", padding: 8 }}>Estado</th>
									<th style={{ padding: 8 }}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{orders.map((o) => (
									<tr key={o.id} style={{ borderTop: "1px solid #eee" }}>
										<td style={{ padding: 8 }}>{o.reference}</td>
										<td style={{ padding: 8 }}>{o.client?.name || o.clientName || "-"}</td>
										<td style={{ padding: 8 }}>{o.address?.label || o.addressText || "-"}</td>
										<td style={{ padding: 8 }}>{o.scheduledAt || "-"}</td>
										<td style={{ padding: 8 }}>{o.status}</td>
										<td style={{ padding: 8 }}>
											{o.status !== "delivered" && (
												<button onClick={() => handleConfirm(o.id)}>Confirmar</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}
		</div>
	);
}
