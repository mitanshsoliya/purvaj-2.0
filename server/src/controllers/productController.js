import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/products
 * List products with category, brand, inventory, and shop-specific pricing.
 */
export const listProducts = async (req, res, next) => {
  try {
    const { category_id, brand_id, search, status = 'active', page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const shopId = req.user?.shop?.id || req.user?.shop?.shop_id || null;

    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (category_id) {
      params.push(category_id);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (brand_id) {
      params.push(brand_id);
      conditions.push(`p.brand_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Main query with category, brand, inventory, and optional shop-specific pricing
    params.push(parseInt(limit));
    params.push(offset);

    let priceSelect = 'p.selling_price';
    let sppJoin = '';

    if (shopId) {
      params.push(shopId);
      const shopParamIndex = params.length;
      priceSelect = `COALESCE(spp.price, p.selling_price) as final_price, spp.price as custom_price, p.selling_price as standard_price`;
      sppJoin = `LEFT JOIN shop_product_prices spp ON spp.product_id = p.id 
                 AND spp.shop_id = $${shopParamIndex} 
                 AND spp.status = 'active'
                 AND (spp.effective_from IS NULL OR spp.effective_from <= CURRENT_DATE)
                 AND (spp.effective_to IS NULL OR spp.effective_to >= CURRENT_DATE)`;
    }

    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        b.name as brand_name,
        COALESCE(inv.available_stock, 0) as available_stock,
        COALESCE(inv.current_stock, 0) as current_stock,
        COALESCE(inv.reserved_stock, 0) as reserved_stock,
        CASE 
          WHEN COALESCE(inv.available_stock, 0) <= 0 THEN 'out_of_stock'
          WHEN COALESCE(inv.available_stock, 0) <= p.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status,
        ${priceSelect}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN inventory inv ON p.id = inv.product_id
      ${sppJoin}
      ${whereClause}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $${params.length - (shopId ? 2 : 1)} OFFSET $${params.length - (shopId ? 1 : 0)}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        products: result.rows,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 * Get single product by ID.
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shopId = req.user?.shop?.id || req.user?.shop?.shop_id || null;

    const queryParams = [id];
    let sppJoinSingle = '';
    let sppSelectSingle = '';

    if (shopId) {
      queryParams.push(shopId);
      sppSelectSingle = `, spp.price as custom_price, COALESCE(spp.price, p.selling_price) as final_price`;
      sppJoinSingle = `LEFT JOIN shop_product_prices spp ON spp.product_id = p.id AND spp.shop_id = $${queryParams.length} AND spp.status = 'active'`;
    }

    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        COALESCE(inv.available_stock, 0) as available_stock,
        COALESCE(inv.current_stock, 0) as current_stock,
        COALESCE(inv.reserved_stock, 0) as reserved_stock,
        CASE 
          WHEN COALESCE(inv.available_stock, 0) <= 0 THEN 'out_of_stock'
          WHEN COALESCE(inv.available_stock, 0) <= p.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
        ${sppSelectSingle}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN inventory inv ON p.id = inv.product_id
      ${sppJoinSingle}
      WHERE p.id = $1
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Product not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    return sendSuccess(res, { data: { product: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products
 * Admin creates a new product and initializes inventory.
 */
export const createProduct = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      name, sku, barcode, category_id, brand_id, description, image,
      unit = 'piece', pack_size = 1, mrp, selling_price, purchase_price = 0,
      tax_rate = 0, hsn_code, minimum_order_quantity = 1, minimum_stock = 0,
      initial_stock = 0, is_featured = false,
    } = req.body;

    if (!name || !sku || mrp === undefined || selling_price === undefined) {
      return sendError(res, { message: 'Name, SKU, MRP, and Selling Price are required', statusCode: 400 });
    }

    await client.query('BEGIN');

    // Check SKU duplicate
    const checkSku = await client.query('SELECT id FROM products WHERE sku = $1', [sku]);
    if (checkSku.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'A product with this SKU already exists', statusCode: 409, code: 'SKU_EXISTS' });
    }

    const insertResult = await client.query(
      `INSERT INTO products (
        name, sku, barcode, category_id, brand_id, description, image,
        unit, pack_size, mrp, selling_price, purchase_price, tax_rate,
        hsn_code, minimum_order_quantity, minimum_stock, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        name, sku, barcode || null, category_id || null, brand_id || null,
        description || null, image || null, unit, pack_size, mrp,
        selling_price, purchase_price, tax_rate, hsn_code || null,
        minimum_order_quantity, minimum_stock, !!is_featured
      ]
    );

    const product = insertResult.rows[0];

    // Initialize inventory record
    await client.query(
      `INSERT INTO inventory (product_id, current_stock, reserved_stock, minimum_stock, last_restocked_at)
       VALUES ($1, $2, 0, $3, CASE WHEN $2 > 0 THEN NOW() ELSE NULL END)`,
      [product.id, Math.max(0, parseInt(initial_stock) || 0), minimum_stock]
    );

    // If initial stock was provided, create stock transaction
    if (parseInt(initial_stock) > 0) {
      await client.query(
        `INSERT INTO stock_transactions (
          product_id, type, quantity, reference_type, previous_stock, new_stock, note, created_by
        ) VALUES ($1, 'STOCK_IN', $2, 'adjustment', 0, $2, 'Initial opening stock', $3)`,
        [product.id, parseInt(initial_stock), req.user?.id || null]
      );
    }

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: product.id,
      newData: { name: product.name, sku: product.sku, selling_price },
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { product }, message: 'Product created successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PUT /api/products/:id
 * Admin updates product details.
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, barcode, category_id, brand_id, description, image,
      unit, pack_size, mrp, selling_price, purchase_price,
      tax_rate, hsn_code, minimum_order_quantity, minimum_stock,
      is_featured, status
    } = req.body;

    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendError(res, { message: 'Product not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        barcode = COALESCE($2, barcode),
        category_id = COALESCE($3, category_id),
        brand_id = COALESCE($4, brand_id),
        description = COALESCE($5, description),
        image = COALESCE($6, image),
        unit = COALESCE($7, unit),
        pack_size = COALESCE($8, pack_size),
        mrp = COALESCE($9, mrp),
        selling_price = COALESCE($10, selling_price),
        purchase_price = COALESCE($11, purchase_price),
        tax_rate = COALESCE($12, tax_rate),
        hsn_code = COALESCE($13, hsn_code),
        minimum_order_quantity = COALESCE($14, minimum_order_quantity),
        minimum_stock = COALESCE($15, minimum_stock),
        is_featured = COALESCE($16, is_featured),
        status = COALESCE($17, status),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *`,
      [
        name, barcode, category_id, brand_id, description, image,
        unit, pack_size, mrp, selling_price, purchase_price,
        tax_rate, hsn_code, minimum_order_quantity, minimum_stock,
        is_featured, status, id
      ]
    );

    // Also update minimum stock in inventory if changed
    if (minimum_stock !== undefined) {
      await pool.query('UPDATE inventory SET minimum_stock = $1 WHERE product_id = $2', [minimum_stock, id]);
    }

    await logAuditAction({
      userId: req.user?.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: id,
      oldData: current,
      newData: result.rows[0],
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { product: result.rows[0] }, message: 'Product updated successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/products/:id
 * Admin soft-deletes a product (sets status to deleted).
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE products SET status = 'deleted', updated_at = NOW() WHERE id = $1 RETURNING id, name, status",
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Product not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    await logAuditAction({
      userId: req.user?.id,
      action: 'PRODUCT_DELETED',
      entityType: 'product',
      entityId: id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { message: 'Product marked as deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products/:id/shop-price
 * Admin sets or updates a shop-specific custom price override.
 */
export const setShopPrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shop_id, price, minimum_quantity = 1, effective_from, effective_to } = req.body;

    if (!shop_id || price === undefined) {
      return sendError(res, { message: 'shop_id and price are required', statusCode: 400 });
    }

    const result = await pool.query(
      `INSERT INTO shop_product_prices (shop_id, product_id, price, minimum_quantity, effective_from, effective_to, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (shop_id, product_id, effective_from)
       DO UPDATE SET price = EXCLUDED.price, minimum_quantity = EXCLUDED.minimum_quantity,
                     effective_to = EXCLUDED.effective_to, updated_at = NOW()
       RETURNING *`,
      [shop_id, id, price, minimum_quantity, effective_from || null, effective_to || null]
    );

    return sendSuccess(res, { data: { priceOverride: result.rows[0] }, message: 'Shop price set successfully' });
  } catch (err) {
    next(err);
  }
};

export default {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  setShopPrice,
};
