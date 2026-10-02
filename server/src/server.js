import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.IO Setup for real-time B2B updates
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] New client connected: ${socket.id}`);

  socket.on('join_shop_room', (shopId) => {
    socket.join(`shop_${shopId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined room shop_${shopId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Attach socket.io to req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    platform: 'Purvaj 2.0 B2B Wholesale Platform API',
    status: 'online',
    warehouse: 'Single Central Warehouse Operations',
    docs: '/api/health',
  });
});

// Central 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on Purvaj 2.0 API server' });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Purvaj Server Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

// Start Server
server.listen(PORT, () => {
  console.log('==================================================');
  console.log(`  PURVAJ 2.0 - B2B WHOLESALE BACKEND SERVER`);
  console.log(`  Status: Running on http://localhost:${PORT}`);
  console.log(`  Central Warehouse Node: PURVAJ_CENTRAL_01`);
  console.log(`  Database Engine: PostgreSQL / Supabase Compatible`);
  console.log('==================================================');
});

export default app;
