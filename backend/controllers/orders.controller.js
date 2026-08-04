import { orders } from "../data/orders.mock.js";
import { clients } from "../data/clients.mock.js";
import { drivers } from "../data/drivers.mock.js";
import { vehicles } from "../data/vehicles.mock.js";

let nextOrderId = orders && orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1;

export const getOrders = (req, res) => {
  try {
    // enrich orders with client/address basic info
    const enriched = orders.map((o) => {
      const client = clients.find((c) => c.id === o.clientId) || null;
      const address = client && client.addresses ? client.addresses.find((a) => a.id === o.addressId) : null;
      const driver = drivers.find((d) => d.id === o.driverId) || null;
      const vehicle = vehicles.find((v) => v.id === o.vehicleId) || null;
      return { ...o, client, address, driver, vehicle };
    });
    return res.json(enriched);
  } catch (error) {
    console.error("getOrders error", error);
    return res.status(500).json({ message: "Error retrieving orders" });
  }
};

export const createOrder = (req, res) => {
  try {
    const data = req.body || {};

    // Basic validations
    if (!data.reference || typeof data.reference !== "string" || data.reference.trim() === "") {
      return res.status(400).json({ message: "reference required" });
    }

    if (!data.driverId && !data.driverName) {
      return res.status(400).json({ message: "driverId required" });
    }

    if (!data.vehicleId && !data.vehiclePlate) {
      return res.status(400).json({ message: "vehicleId required" });
    }

    // Validate driver/vehicle against mocks (if IDs provided)
    if (data.driverId && !drivers.find((d) => Number(d.id) === Number(data.driverId))) {
      return res.status(400).json({ message: "driverId not found" });
    }
    if (data.vehicleId && !vehicles.find((v) => Number(v.id) === Number(data.vehicleId))) {
      return res.status(400).json({ message: "vehicleId not found" });
    }

    // If clientName provided without clientId, try to find or create a client in-memory
    let clientId = data.clientId || null;
    if (!clientId && data.clientName) {
      const existing = clients.find((c) => c.name.toLowerCase() === String(data.clientName).toLowerCase());
      if (existing) clientId = existing.id;
      else {
        const newId = clients.length ? Math.max(...clients.map((c) => c.id)) + 1 : 1;
        const newClient = { id: newId, name: data.clientName, addresses: [] };
        clients.push(newClient);
        clientId = newId;
      }
    }

    // If addressText provided and no addressId, create address under clientId if available
    let addressId = data.addressId || null;
    if (!addressId && data.addressText && clientId) {
      const client = clients.find((c) => c.id === Number(clientId));
      if (client) {
        client.addresses = client.addresses || [];
        const newAddrId = client.addresses.length ? Math.max(...client.addresses.map((a) => a.id)) + 1 : 1;
        const addr = {
          id: newAddrId,
          label: data.addressText,
          street: data.addressText,
          city: data.city || "",
          state: data.state || "",
          postalCode: data.postalCode || "",
          country: data.country || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        };
        client.addresses.push(addr);
        addressId = addr.id;
      }
    }

    const newOrder = {
      id: nextOrderId++,
      reference: String(data.reference),
      clientId: clientId ? Number(clientId) : null,
      clientName: data.clientName || null,
      addressId: addressId ? Number(addressId) : null,
      driverId: data.driverId ? Number(data.driverId) : null,
      vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
      scheduledAt: data.scheduledAt || null,
      status: data.status || "planned",
    };

    orders.push(newOrder);

    // return enriched response
    const client = clients.find((c) => c.id === newOrder.clientId) || null;
    const address = client && client.addresses ? client.addresses.find((a) => a.id === newOrder.addressId) : null;
    const driver = drivers.find((d) => d.id === newOrder.driverId) || null;
    const vehicle = vehicles.find((v) => v.id === newOrder.vehicleId) || null;

    return res.status(201).json({ ...newOrder, client, address, driver, vehicle });
  } catch (error) {
    console.error("createOrder error", error);
    return res.status(500).json({ message: "Error creating order" });
  }
};

// In-memory audit log for status changes
export const ordersAudit = [];

export const updateOrderStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveredBy } = req.body;
    const order = orders.find((o) => Number(o.id) === Number(id));
    if (!order) return res.status(404).json({ message: "Order not found" });

    const validStatuses = ["planned", "in_route", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const from = order.status;
    const to = status;

    // Simple state machine rules
    const allowed = (
      (from === "planned" && (to === "in_route" || to === "cancelled")) ||
      (from === "in_route" && (to === "delivered" || to === "cancelled")) ||
      (from === to)
    );

    if (!allowed) return res.status(400).json({ message: `Invalid transition from ${from} to ${to}` });

    order.status = to;
    if (to === "delivered") {
      order.deliveredAt = new Date().toISOString();
      if (deliveredBy) order.deliveredBy = deliveredBy;
    }

    // record audit
    ordersAudit.push({ orderId: order.id, from, to, at: new Date().toISOString(), by: deliveredBy || null });

    // return enriched order
    const client = clients.find((c) => c.id === order.clientId) || null;
    const address = client && client.addresses ? client.addresses.find((a) => a.id === order.addressId) : null;
    const driver = drivers.find((d) => d.id === order.driverId) || null;
    const vehicle = vehicles.find((v) => v.id === order.vehicleId) || null;

    return res.json({ ...order, client, address, driver, vehicle });
  } catch (error) {
    console.error("updateOrderStatus error", error);
    return res.status(500).json({ message: "Error updating order status" });
  }
};

