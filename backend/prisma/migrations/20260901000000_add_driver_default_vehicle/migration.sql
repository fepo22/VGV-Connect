ALTER TABLE "User" ADD COLUMN "defaultVehicleId" INTEGER;

ALTER TABLE "User"
ADD CONSTRAINT "User_defaultVehicleId_fkey"
FOREIGN KEY ("defaultVehicleId") REFERENCES "Vehicle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_defaultVehicleId_idx" ON "User"("defaultVehicleId");