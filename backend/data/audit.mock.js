export const auditLogs = [];

export const logAudit = ({ action, userId, role, entity, entityId, metadata = {} }) => {
  auditLogs.push({
    id: Date.now(),
    action,
    userId,
    role,
    entity,
    entityId,
    metadata,
    createdAt: new Date().toISOString(),
  });
};