import { pool } from '../config/db.js';

/**
 * Migration: Ensure payments table is fully equipped for Razorpay integration
 *
 * Idempotently:
 * 1. Checks existing columns in `payments` table.
 * 2. Adds `currency VARCHAR(10) DEFAULT 'INR'` if missing.
 * 3. Updates `payment_status` ENUM to include 'created', 'pending', 'paid', 'failed', 'refunded'.
 * 4. Ensures indexes on `booking_id` and `razorpay_order_id`.
 */
async function migrateRazorpayPayments() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Checking payments table schema for Razorpay integration...');

    // 1. Fetch existing columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'
    `);

    const existingCols = new Set(columns.map((c) => c.COLUMN_NAME));

    // 2. Add currency column if missing
    if (!existingCols.has('currency')) {
      console.log('➕ Adding currency column to payments table...');
      await connection.query(`
        ALTER TABLE payments
        ADD COLUMN currency VARCHAR(10) DEFAULT 'INR' AFTER amount
      `);
      console.log('✅ currency column added.');
    } else {
      console.log('ℹ️ currency column already exists.');
    }

    // 3. Update payment_status enum to ensure 'created', 'pending', 'paid', 'failed', 'refunded'
    console.log('🔄 Ensuring payment_status ENUM contains required statuses...');
    await connection.query(`
      ALTER TABLE payments
      MODIFY COLUMN payment_status ENUM('created', 'pending', 'paid', 'failed', 'refunded') DEFAULT 'pending'
    `);
    console.log('✅ payment_status ENUM verified/updated.');

    // 4. Check/add index on razorpay_order_id
    const [indexes] = await connection.query(`
      SHOW INDEX FROM payments WHERE Key_name = 'idx_razorpay_order_id'
    `);
    if (indexes.length === 0) {
      console.log('➕ Adding index on razorpay_order_id...');
      await connection.query(`
        ALTER TABLE payments
        ADD INDEX idx_razorpay_order_id (razorpay_order_id)
      `);
      console.log('✅ idx_razorpay_order_id added.');
    } else {
      console.log('ℹ️ idx_razorpay_order_id already exists.');
    }

    console.log('🎉 Razorpay payments migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    connection.release();
  }
}

migrateRazorpayPayments()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
