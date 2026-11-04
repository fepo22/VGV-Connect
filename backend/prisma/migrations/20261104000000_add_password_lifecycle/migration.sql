-- Aditiva: los usuarios existentes quedan con mustChangePassword = false y passwordChangedAt = NULL,
-- por lo que conservan su contraseña y sus sesiones vigentes.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
