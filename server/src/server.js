import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import broadcastRoutes from './routes/broadcastRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.IO Setup for real-time B2B updates
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);

  socket.on('join_shop_room', (shopId) => {
    socket.join(`shop_${shopId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined room shop_${shopId}`);
  });

  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log(`[Socket.IO] Client ${socket.id} joined admin_room`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Attach socket.io instance to req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/staff', staffRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    platform: 'Purvaj 2.0 B2B Wholesale Platform API',
    status: 'online',
    warehouse: 'Single Central Warehouse Operations',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      products: '/api/products',
      categories: '/api/categories',
      inventory: '/api/inventory',
      orders: '/api/orders',
      shops: '/api/shops',
      billing: '/api/billing',
      payments: '/api/payments',
      offers: '/api/offers',
      returns: '/api/returns',
      reports: '/api/reports',
      notifications: '/api/notifications',
      broadcasts: '/api/broadcasts',
      delivery: '/api/delivery',
      staff: '/api/staff',
    },
  });
});

// Central 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler (Zod, JWT, DB, AppError)
app.use(errorHandler);

// Start Server if directly executed
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log('==================================================');
    console.log(`  PURVAJ 2.0 - B2B WHOLESALE BACKEND SERVER`);
    console.log(`  Status: Running on http://localhost:${PORT}`);
    console.log(`  Central Warehouse Node: PURVAJ_CENTRAL_01`);
    console.log(`  Database Engine: PostgreSQL / Supabase Connected`);
    console.log(`  Modules: 16 API Services Active`);
    console.log('==================================================');
  });
}

export default app;
