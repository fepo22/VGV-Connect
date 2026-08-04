import http from "./http";

export const getPlannedRoutes = async () => {
  const response = await http.get("/routes/planned");
  return response.data;
};

export const optimizeRoute = async (driverId) => {
  try {
    return await getPlannedRoutes(driverId);
  } catch (error) {
    console.error("Error fetching route plan:", error);
    return {
      routes: [
        {
          id: 1,
          client: "Empresa XYZ",
          address: "Av. Central 456",
          status: "in_route",
          driver: "Construcción",
          eta: "10:30",
          sequence: 1,
          location: { lat: -33.45, lng: -70.66 },
        },
        {
          id: 2,
          client: "Juan Pérez",
          address: "Calle 123",
          status: "pending",
          driver: "Construcción",
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
  }
};
