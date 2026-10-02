import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/categories
 * List all categories with product counts.
 */
export const listCategories = async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;
    const params = [];
    let whereClause = '';

    if (status !== 'all') {
      params.push(status);
      whereClause = `WHERE c.status = $1`;
    }

    const query = `
      SELECT 
        c.*,
        p.name as parent_name,
        COUNT(prod.id)::int as product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      LEFT JOIN products prod ON prod.category_id = c.id AND prod.status = 'active'
      ${whereClause}
      GROUP BY c.id, p.name
      ORDER BY c.sort_order ASC, c.name ASC
    `;

    const result = await pool.query(query, params);
    return sendSuccess(res, { data: { categories: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/categories/:id
 * Get single category by ID or slug.
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = isUuid
      ? `SELECT c.*, p.name as parent_name FROM categories c LEFT JOIN categories p ON c.parent_id = p.id WHERE c.id = $1`
      : `SELECT c.*, p.name as parent_name FROM categories c LEFT JOIN categories p ON c.parent_id = p.id WHERE c.slug = $1`;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return sendError(res, { message: 'Category not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    return sendSuccess(res, { data: { category: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/categories
 * Admin creates a new category.
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, parent_id, sort_order = 0 } = req.body;

    if (!name) {
      return sendError(res, { message: 'Category name is required', statusCode: 400 });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await pool.query('SELECT id FROM categories WHERE slug = $1', [finalSlug]);
    if (existing.rows.length > 0) {
      return sendError(res, { message: 'A category with this slug already exists', statusCode: 409 });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, image, parent_id, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [name, finalSlug, description || null, image || null, parent_id || null, sort_order]
    );

    await logAuditAction({
      userId: req.user?.id,
      action: 'CATEGORY_CREATED',
      entityType: 'category',
      entityId: result.rows[0].id,
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { category: result.rows[0] }, message: 'Category created' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/categories/:id
 * Admin updates a category.
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, parent_id, sort_order, status } = req.body;

    const result = await pool.query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        image = COALESCE($4, image),
        parent_id = COALESCE($5, parent_id),
        sort_order = COALESCE($6, sort_order),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *`,
      [name, slug, description, image, parent_id, sort_order, status, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Category not found', statusCode: 404 });
    }

    await logAuditAction({
      userId: req.user?.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'category',
      entityId: id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { category: result.rows[0] }, message: 'Category updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/categories/:id
 * Admin deactivates category.
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE categories SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Category not found', statusCode: 404 });
    }

    return sendSuccess(res, { message: 'Category deactivated' });
  } catch (err) {
    next(err);
  }
};

export default {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
