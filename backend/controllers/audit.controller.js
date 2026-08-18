import prisma from "../prismaClient.js";

export const getAuditLogs = async (_req, res) => {
  res.json(await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }));
};

export const getDriverAuditLogs = async (req, res) => {
  res.json(await prisma.auditLog.findMany({ where: { userId: Number(req.user.sub), entity: "delivery" }, orderBy: { createdAt: "desc" }, take: 100 }));
};
