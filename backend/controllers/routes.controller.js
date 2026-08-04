import prisma from "../prismaClient.js";

const fallbackRoutes = {
  routes: [
    {
      id: 1,
      client: "Empresa XYZ",
      address: "Av. Central 456",
      status: "in_route",
      driver: "Chofer asignado",
      vehicle: "ABC-123",
      eta: "10:30",
      sequence: 1,
      location: { lat: -33.45, lng: -70.66 },
    },
    {
      id: 2,
      client: "Juan Pérez",
      address: "Calle 123",
      status: "pending",
      driver: "Chofer asignado",
      vehicle: "XYZ-789",
      eta: "11:15",
      sequence: 2,
      location: { lat: -33.47, lng: -70.65 },
    },
  ],
  coordinates: [
    { lat: -33.45, lng: -70.66 },
    { lat: -33.47, lng: -70.65 },
  ],
};

export const getPlannedRoutes = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { client: true, address: true, driver: true, vehicle: true },
      orderBy: { id: "asc" },
    });

    if (!orders.length) {
      return res.json(fallbackRoutes);
    }

    const routes = orders.map((order, index) => {
      const addressLabel = order.address
        ? `${order.address.street}, ${order.address.city}`
        : "Dirección no registrada";

      const lat = order.address?.latitude ?? -33.45 + index * 0.005;
      const lng = order.address?.longitude ?? -70.66 + index * 0.005;

      return {
        id: order.id,
        reference: order.reference || `GUÍA-${order.id}`,
        client: order.client?.name || "Cliente desconocido",
        address: addressLabel,
        status: order.status,
        driver: order.driver?.name || "Sin chofer",
        vehicle: order.vehicle?.licensePlate || "Sin vehículo",
        eta: order.scheduledAt ? order.scheduledAt.toISOString().slice(11, 16) : "Por definir",
        sequence: index + 1,
        location: { lat, lng },
        geoPoint: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };
    });

    const coordinates = routes.map((route) => route.location);

    res.json({ routes, coordinates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
