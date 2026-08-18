import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  ["admin", "Administrador", "admin", "admin123"],
  ["programador", "Programador", "route_planner", "programador123"],
  ["faturacion", "Yessica", "billing", "faturacion123"],
  ["nalvarez", "Nicolas Alvarez", "driver", "nalvarez123"],
  ["acampos", "Alejandro Campos", "driver", "acampos123"],
  ["msolis", "Mauricio Solis", "driver", "msolis123"],
  ["rtito", "Roberto Saavedra", "driver", "rtito123"],
  ["lseal", "Luis Seal", "driver", "lseal123"],
  ["ltorres", "Luis Torres", "driver", "ltorres123"],
  ["Tsantos", "Tolentino Santos", "driver", "tsantos123"],
];

async function main() {
  for (const [username, name, role, password] of users) {
    await prisma.user.upsert({
      where: { username },
      update: { name, role, passwordHash: await bcrypt.hash(password, 10) },
      create: { username, name, role, passwordHash: await bcrypt.hash(password, 10) },
    });
  }

  const vehicleSpecs = [
    ["Camion VGV-01", "VGVC-01", 3500, 18], ["Camion VGV-02", "VGVC-02", 5000, 26],
    ["Camion VGV-03", "VGVC-03", 7500, 38], ["Camion VGV-04", "VGVC-04", 10000, 52],
    ["Camion VGV-05", "VGVC-05", 12000, 64], ["Camion VGV-06", "VGVC-06", 18000, 82],
    ["Camion VGV-07", "VGVC-07", 25000, 100],
  ];
  for (const [name, licensePlate, maxWeightKg, maxVolumeM3] of vehicleSpecs) {
    await prisma.vehicle.upsert({ where: { licensePlate }, update: { name, maxWeightKg, maxVolumeM3 }, create: { name, licensePlate, maxWeightKg, maxVolumeM3 } });
  }

  await prisma.deliveryEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.route.deleteMany();

  const drivers = await prisma.user.findMany({ where: { role: "driver" }, orderBy: { id: "asc" } });
  const vehicles = await prisma.vehicle.findMany({ orderBy: { id: "asc" } });
  const communes = ["Santiago", "Maipú", "Pudahuel", "Quilicura", "La Florida", "Puente Alto", "Las Condes", "Renca", "Ñuñoa", "San Miguel"];
  const streets = ["Av. Providencia", "Av. Vicuña Mackenna", "Gran Avenida", "Camino Melipilla", "Av. La Florida", "Av. Matta", "Av. Grecia", "Av. Las Condes"];
  const clients = ["Distribuidora Andina", "Comercial Los Alerces", "Farmacias del Sur", "Restaurante Central", "Ferretería Horizonte", "Importadora Vértice", "Supermercado La Plaza", "Bodega San Cristóbal"];
  const startLat = -33.45;
  const startLng = -70.66;

  let deliverySequence = 1;
  for (let routeIndex = 0; routeIndex < 14; routeIndex += 1) {
    const driver = drivers[routeIndex % drivers.length];
    const vehicle = vehicles[routeIndex % vehicles.length];
    const routeDate = new Date(Date.now() + (routeIndex % 5) * 86400000);
    const dateText = routeDate.toISOString().slice(0, 10);
    const route = await prisma.route.create({ data: {
      serviceDate: routeDate,
      startAt: new Date(`${dateText}T${String(7 + (routeIndex % 4)).padStart(2, "0")}:30:00`),
      origin: "Centro de Distribución VGV, Santiago",
      destination: `${communes[routeIndex % communes.length]}, Región Metropolitana`,
      documentType: "guide",
      documentNumber: `RUTA-${dateText.replaceAll("-", "")}-${String(routeIndex + 1).padStart(2, "0")}`,
      status: routeIndex < 3 ? "in_progress" : "planned",
      driverId: driver.id,
      vehicleId: vehicle.id,
      distanceKm: 8 + ((routeIndex * 17) % 95),
    }});

    const routeDeliveries = [];
    const routeCount = routeIndex < 4 ? 15 : 14;
    for (let stop = 0; stop < routeCount; stop += 1) {
      const sequence = deliverySequence;
      deliverySequence += 1;
      const street = streets[(sequence + routeIndex) % streets.length];
      const commune = communes[(sequence + routeIndex) % communes.length];
      const number = 100 + ((sequence * 37) % 8900);
      const weightKg = 25 + ((sequence * 83) % Math.max(100, Math.floor(vehicle.maxWeightKg / 3)));
      const volumeM3 = Number((0.15 + ((sequence * 17) % 180) / 100).toFixed(3));
      const lat = Number((startLat + ((sequence * 13) % 80) / 1000).toFixed(7));
      const lng = Number((startLng - ((sequence * 19) % 100) / 1000).toFixed(7));
      routeDeliveries.push({ clientName: clients[sequence % clients.length], guideNumber: `GD-${dateText.replaceAll("-", "")}-${String(sequence).padStart(4, "0")}`, address: `${street} ${number}, ${commune}, Región Metropolitana`, street, streetNumber: String(number), commune, region: "Metropolitana", status: routeIndex < 2 && stop < 3 ? "completed" : routeIndex < 3 ? "in_progress" : "pending", routeId: route.id, driverId: driver.id, latitude: lat, longitude: lng, weightKg, volumeM3 });
    }
    await prisma.delivery.createMany({ data: routeDeliveries });
  }

  console.log("Seed creado: 200 guías, 14 rutas, 7 choferes y 7 camiones");
}

main().finally(() => prisma.$disconnect());
