import prisma from "../prismaClient.js";

export const getDriversOverview = async (_req, res) => {
  const drivers = await prisma.user.findMany({
    where: { role: "driver" },
    select: {
      id: true,
      username: true,
      name: true,
      routes: { select: { id: true, status: true, documentType: true, documentNumber: true, serviceDate: true, destination: true, distanceKm: true, vehicle: { select: { licensePlate: true, name: true } } } },
      deliveries: { where: { routeId: { not: null } }, select: { id: true, status: true, weightKg: true, volumeM3: true, routeId: true } },
    },
    orderBy: { name: "asc" },
  });

  const overview = drivers.map((driver) => {
    const completed = driver.deliveries.filter((item) => item.status === "completed").length;
    const incidents = driver.deliveries.filter((item) => ["rejected", "not_found"].includes(item.status)).length;
    const weightKg = driver.deliveries.reduce((sum, item) => sum + Number(item.weightKg || 0), 0);
    const volumeM3 = driver.deliveries.reduce((sum, item) => sum + Number(item.volumeM3 || 0), 0);
    return {
      id: driver.id,
      username: driver.username,
      name: driver.name,
      routes: driver.routes,
      routeCount: driver.routes.length,
      activeRoutes: driver.routes.filter((route) => ["planned", "in_progress"].includes(route.status)).length,
      deliveries: driver.deliveries.length,
      completed,
      pending: driver.deliveries.length - completed,
      incidents,
      completionRate: driver.deliveries.length ? Math.round((completed / driver.deliveries.length) * 100) : 0,
      weightKg: Number(weightKg.toFixed(2)),
      volumeM3: Number(volumeM3.toFixed(3)),
    };
  });

  res.json({
    drivers: overview,
    summary: {
      drivers: overview.length,
      activeRoutes: overview.reduce((sum, item) => sum + item.activeRoutes, 0),
      deliveries: overview.reduce((sum, item) => sum + item.deliveries, 0),
      completed: overview.reduce((sum, item) => sum + item.completed, 0),
      incidents: overview.reduce((sum, item) => sum + item.incidents, 0),
    },
  });
};
