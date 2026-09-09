import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool for MySQL
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'homefix_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Helper to test database connection status safely.
 * Returns true if connected, false otherwise.
 */
export const checkDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return { connected: true, message: 'MySQL connected successfully' };
  } catch (error) {
    return {
      connected: false,
      message: `MySQL not connected: ${error.message}. Make sure MySQL is running and credentials in .env are correct.`,
    };
  }
};
