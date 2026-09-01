CREATE TABLE "VehicleCheck" (
  "id" SERIAL NOT NULL,
  "driverId" INTEGER NOT NULL,
  "vehicleId" INTEGER NOT NULL,
  "checkDate" TIMESTAMP(3) NOT NULL,
  "odometer" INTEGER,
  "odometerPhotoUrl" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "observations" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VehicleCheck_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VehicleCheck"
ADD CONSTRAINT "VehicleCheck_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleCheck"
ADD CONSTRAINT "VehicleCheck_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "VehicleCheck_driverId_vehicleId_checkDate_key" ON "VehicleCheck"("driverId", "vehicleId", "checkDate");
CREATE INDEX "VehicleCheck_driverId_checkDate_idx" ON "VehicleCheck"("driverId", "checkDate");
CREATE INDEX "VehicleCheck_vehicleId_checkDate_idx" ON "VehicleCheck"("vehicleId", "checkDate");