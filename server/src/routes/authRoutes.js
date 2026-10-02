import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'purvaj_super_secret_jwt_key_2026';

/**
 * Authentication login endpoint foundation
 */
router.post('/login', (req, res) => {
  const { email, role = 'admin' } = req.body;

  const user = role === 'admin'
    ? {
        id: 'usr_admin_01',
        name: 'Purvaj Admin',
        email: email || 'admin@purvaj.com',
        role: 'admin',
        warehouse: 'Main Central Warehouse',
      }
    : {
        id: 'usr_shop_102',
        name: 'Ramesh Patel',
        shopName: 'Shree Krishna Traders',
        email: email || 'sk.traders@purvaj.shop',
        role: 'shop',
        gstin: '24AAACP1234M1Z2',
        creditLimit: 250000,
        city: 'Ahmedabad',
      };

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Authentication successful',
    token,
    user,
  });
});

/**
 * Verify current user session endpoint
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
});

export default router;
