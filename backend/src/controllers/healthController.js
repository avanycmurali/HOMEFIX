import { checkDbConnection } from '../config/db.js';

/**
 * Health check controller to verify backend server and database availability
 */
export const getHealthStatus = async (req, res) => {
  const dbStatus = await checkDbConnection();

  return res.status(200).json({
    success: true,
    status: 'OK',
    app: 'HOMEFIX — Smart Home Service Booking System',
    message: 'Backend server is running smoothly',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: dbStatus.connected,
      details: dbStatus.message,
    },
  });
};
