import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

const baseUsers = [
  ["admin", "Administrador", "admin", "admin123"],
  ["programador", "Programador", "route_planner", "programador123"],
  ["faturacion", "Yessica", "billing", "faturacion123"],
];

async function main() {
  for (const [username, name, role, password] of baseUsers) {
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

  // Generación de datos de prueba (rutas y entregas ficticias) deshabilitada.
  // Solo se siembran usuarios y vehículos; entregas/rutas se cargan con datos reales.

  console.log("Seed creado: usuarios base y vehículos (sin conductores/rutas/entregas de prueba)");
}

main().finally(() => prisma.$disconnect());
