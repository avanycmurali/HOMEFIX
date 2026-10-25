import { pool } from '../config/db.js';

async function migrateDemoPayments() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Checking payments table for demo payment support...');

    await connection.query(`
      ALTER TABLE payments
      MODIFY COLUMN payment_method ENUM('cash', 'razorpay', 'upi', 'card', 'demo') DEFAULT 'razorpay'
    `);
    console.log('✅ payment_method ENUM updated to include "demo".');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateDemoPayments();
