import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

const SALT_ROUNDS = 12;

/**
 * GET /api/staff
 * List all admin and warehouse staff members.
 */
export const listStaff = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.*,
        u.name,
        u.email,
        u.mobile,
        u.role as user_role,
        u.is_active as user_active,
        u.last_login_at
       FROM staff s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    );

    return sendSuccess(res, { data: { staff: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/staff
 * Admin creates a new staff account.
 */
export const createStaff = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, email, mobile, password, role = 'warehouse_manager', department, designation } = req.body;

    if (!name || !email || !password) {
      return sendError(res, { message: 'Name, email, and password are required', statusCode: 400 });
    }

    await client.query('BEGIN');

    // Check email uniqueness
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'User with this email already exists', statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userRes = await client.query(
      `INSERT INTO users (name, email, mobile, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, email, mobile, role`,
      [name, email, mobile || null, passwordHash, role]
    );
    const newUser = userRes.rows[0];

    const staffRes = await client.query(
      `INSERT INTO staff (user_id, department, designation, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [newUser.id, department || null, designation || null]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'STAFF_CREATED',
      entityType: 'staff',
      entityId: staffRes.rows[0].id,
      newData: { name, email, role, department },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: { staff: { ...staffRes.rows[0], user: newUser } },
      message: 'Staff member account created',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PUT /api/staff/:id
 * Update staff department, designation, or role.
 */
export const updateStaff = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, mobile, department, designation, role, is_active } = req.body;

    await client.query('BEGIN');

    const staffRes = await client.query('SELECT * FROM staff WHERE id = $1', [id]);
    if (staffRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Staff record not found', statusCode: 404 });
    }
    const staff = staffRes.rows[0];

    // Update staff record
    await client.query(
      `UPDATE staff SET
        department = COALESCE($1, department),
        designation = COALESCE($2, designation),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
       WHERE id = $4`,
      [department, designation, is_active, id]
    );

    // Update underlying user
    await client.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        mobile = COALESCE($2, mobile),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5`,
      [name, mobile, role, is_active, staff.user_id]
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'STAFF_UPDATED',
      entityType: 'staff',
      entityId: id,
      newData: { department, designation, role },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { message: 'Staff member updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export default {
  listStaff,
  createStaff,
  updateStaff,
};
