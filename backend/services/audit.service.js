import prisma from "../prismaClient.js";

export const logAudit = async ({ action, userId, entity, entityId, metadata = {} }) =>
  prisma.auditLog.create({ data: { action, userId: userId ? Number(userId) : null, entity, entityId: entityId ? Number(entityId) : null, metadata } });

export const logDeliveryEvent = async ({ deliveryId, action, metadata = {} }) =>
  prisma.deliveryEvent.create({ data: { deliveryId: Number(deliveryId), action, metadata } });
