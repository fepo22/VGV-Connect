import { drivers } from "../data/drivers.mock.js";
import { orders } from "../data/orders.mock.js";
import { clients } from "../data/clients.mock.js";
import { vehicles } from "../data/vehicles.mock.js";

export const getDrivers = (req, res) => {
  res.json(drivers);
};

export const getDriverOrders = (req, res) => {
  try {
    const { id } = req.params;
    const statusFilter = req.query.status; // optional filter
    const driverId = Number(id);
    let filtered = orders.filter((o) => Number(o.driverId) === driverId);
    if (statusFilter) filtered = filtered.filter((o) => o.status === statusFilter);

    const enriched = filtered.map((o) => {
      const client = clients.find((c) => c.id === o.clientId) || null;
      const address = client && client.addresses ? client.addresses.find((a) => a.id === o.addressId) : null;
      const vehicle = vehicles.find((v) => v.id === o.vehicleId) || null;
      return { ...o, client, address, vehicle };
    });

    // sort by scheduledAt if present
    enriched.sort((a, b) => {
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt) - new Date(b.scheduledAt);
    });

    return res.json(enriched);
  } catch (error) {
    console.error("getDriverOrders error", error);
    return res.status(500).json({ message: "Error retrieving driver orders" });
  }
};
