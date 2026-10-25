import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import { checkDbConnection } from './config/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded complaint photos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    app: 'HOMEFIX API',
    description: 'Smart Home Service Booking System with Intelligent Technician Recommendation',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      services: '/api/services',
      bookings: '/api/bookings',
      admin: '/api/admin',
      technician: '/api/technician',
    },
  });
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/technician', technicianRoutes);

// Fallback error handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 HOMEFIX Backend running on http://localhost:${PORT}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
  console.log('====================================================');

  // Check database connectivity on startup
  const dbStatus = await checkDbConnection();
  if (dbStatus.connected) {
    console.log(`✅ [Database]: ${dbStatus.message}`);
  } else {
    console.log(`ℹ️  [Database]: ${dbStatus.message}`);
  }
});
