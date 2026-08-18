import { auditLogs } from "../data/audit.mock.js";

export const getAuditLogs = (_req, res) => {
  res.json(auditLogs);
};