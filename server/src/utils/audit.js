import pool from '../config/db.js';

/**
 * PURVAJ 2.0 — Admin Audit Logger
 * Logs sensitive admin actions to audit_logs table for security compliance.
 */
export const logAuditAction = async ({
  userId,
  action,
  entityType,
  entityId,
  oldData = null,
  newData = null,
  details = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    const payload = newData || details;
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId || null,
        action,
        entityType,
        entityId || null,
        oldData ? JSON.stringify(oldData) : null,
        payload ? JSON.stringify(payload) : null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (err) {
    // Audit logging should never crash the main flow
    console.error('[Audit Log Error]:', err.message);
  }
};

export default logAuditAction;
