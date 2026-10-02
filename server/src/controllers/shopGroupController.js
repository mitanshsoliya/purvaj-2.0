import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/shop-groups
 * List all shop groups with member count & preview
 */
export const listShopGroups = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        sg.*,
        COUNT(sgm.shop_id)::int as member_count,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'shop_name', s.shop_name, 'city', s.city)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'::json
        ) as member_preview
      FROM shop_groups sg
      LEFT JOIN shop_group_members sgm ON sg.id = sgm.shop_group_id
      LEFT JOIN shops s ON sgm.shop_id = s.id
      WHERE sg.status = 'active'
      GROUP BY sg.id
      ORDER BY sg.created_at ASC
    `;

    const result = await pool.query(query);

    return sendSuccess(res, {
      data: { groups: result.rows },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/shop-groups
 * Create new shop group (e.g. VIP Shops, Surat Shops, Custom Groups)
 */
export const createShopGroup = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const { name, description, discount_percentage = 0, shop_ids = [] } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, { message: 'Group name is required', statusCode: 400 });
    }

    await client.query('BEGIN');

    const groupRes = await client.query(
      `INSERT INTO shop_groups (name, description, discount_percentage, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [name.trim(), description || null, parseFloat(discount_percentage) || 0]
    );
    const group = groupRes.rows[0];

    // Add initial shops if provided
    if (Array.isArray(shop_ids) && shop_ids.length > 0) {
      for (const shopId of shop_ids) {
        await client.query(
          `INSERT INTO shop_group_members (shop_group_id, shop_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [group.id, shopId]
        );
      }
    }

    await client.query('COMMIT');

    await logAuditAction({
      userId: user.id,
      action: 'SHOP_GROUP_CREATED',
      entityType: 'shop_group',
      entityId: group.id,
      newData: { name, memberCount: shop_ids.length },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: { group },
      message: `Shop group '${group.name}' created successfully`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/shop-groups/:id
 * Get single shop group with all member shops
 */
export const getShopGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const groupRes = await pool.query('SELECT * FROM shop_groups WHERE id = $1', [id]);
    if (groupRes.rows.length === 0) {
      return sendError(res, { message: 'Shop group not found', statusCode: 404 });
    }

    const membersRes = await pool.query(
      `SELECT s.id, s.shop_name, s.owner_name, s.mobile, s.city, s.gstin, s.credit_limit, s.credit_used, sgm.added_at
       FROM shop_group_members sgm
       JOIN shops s ON sgm.shop_id = s.id
       WHERE sgm.shop_group_id = $1
       ORDER BY s.shop_name ASC`,
      [id]
    );

    return sendSuccess(res, {
      data: {
        group: {
          ...groupRes.rows[0],
          members: membersRes.rows,
          member_count: membersRes.rows.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/shop-groups/:id/members
 * Add shop(s) to group
 */
export const addMembersToGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shop_ids } = req.body;

    if (!Array.isArray(shop_ids) || shop_ids.length === 0) {
      return sendError(res, { message: 'shop_ids array is required', statusCode: 400 });
    }

    let addedCount = 0;
    for (const shopId of shop_ids) {
      const ins = await pool.query(
        `INSERT INTO shop_group_members (shop_group_id, shop_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, shopId]
      );
      if (ins.rowCount > 0) addedCount++;
    }

    return sendSuccess(res, {
      message: `${addedCount} shops added to group`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/shop-groups/:id/members/:shopId
 * Remove single shop from group
 */
export const removeMemberFromGroup = async (req, res, next) => {
  try {
    const { id, shopId } = req.params;

    const del = await pool.query(
      'DELETE FROM shop_group_members WHERE shop_group_id = $1 AND shop_id = $2',
      [id, shopId]
    );

    if (del.rowCount === 0) {
      return sendError(res, { message: 'Shop is not a member of this group', statusCode: 404 });
    }

    return sendSuccess(res, { message: 'Shop removed from group' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/shop-groups/:id
 * Delete a custom group
 */
export const deleteShopGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const del = await pool.query('DELETE FROM shop_groups WHERE id = $1 RETURNING *', [id]);
    if (del.rows.length === 0) {
      return sendError(res, { message: 'Group not found', statusCode: 404 });
    }

    return sendSuccess(res, { message: `Group '${del.rows[0].name}' deleted` });
  } catch (err) {
    next(err);
  }
};

export default {
  listShopGroups,
  createShopGroup,
  getShopGroupById,
  addMembersToGroup,
  removeMemberFromGroup,
  deleteShopGroup,
};
