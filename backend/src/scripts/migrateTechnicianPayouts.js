import { pool } from '../config/db.js';

/**
 * Migration: Create technician_payouts table for technician earnings and payout tracking.
 */
export async function migrateTechnicianPayouts() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Checking technician_payouts table schema...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS technician_payouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        technician_id INT NOT NULL,
        payment_id INT NOT NULL UNIQUE,
        gross_amount DECIMAL(10,2) NOT NULL,
        platform_fee DECIMAL(10,2) NOT NULL,
        technician_amount DECIMAL(10,2) NOT NULL,
        payout_status ENUM('pending', 'paid') DEFAULT 'pending',
        payout_reference VARCHAR(100) NULL,
        paid_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payout_tech (technician_id),
        INDEX idx_payout_booking (booking_id),
        INDEX idx_payout_status (payout_status),
        CONSTRAINT fk_payout_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        CONSTRAINT fk_payout_technician FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_payout_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ technician_payouts table verified / created successfully.');

    // Backfill any existing completed bookings with paid payments that don't have a payout record yet
    const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
    console.log(`🔄 Checking for backfill candidates with ${feePercent}% platform fee...`);

    const [unprocessedPayments] = await connection.query(`
      SELECT p.id AS payment_id, p.booking_id, p.amount, tp.user_id AS tech_user_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN technician_profiles tp ON b.technician_id = tp.id
      LEFT JOIN technician_payouts pay ON p.id = pay.payment_id
      WHERE p.payment_status = 'paid'
        AND pay.id IS NULL
    `);

    if (unprocessedPayments.length > 0) {
      console.log(`ℹ️ Found ${unprocessedPayments.length} existing paid bookings to backfill into technician_payouts.`);
      for (const row of unprocessedPayments) {
        const gross = parseFloat(row.amount);
        const platformFee = Math.round((gross * feePercent / 100) * 100) / 100;
        const techAmount = Math.round((gross - platformFee) * 100) / 100;

        await connection.query(`
          INSERT IGNORE INTO technician_payouts
            (booking_id, technician_id, payment_id, gross_amount, platform_fee, technician_amount, payout_status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `, [row.booking_id, row.tech_user_id, row.payment_id, gross, platformFee, techAmount]);
      }
      console.log(`✅ Backfilled ${unprocessedPayments.length} existing payments into technician_payouts.`);
    } else {
      console.log('ℹ️ No backfill needed.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Execute directly if run as a script
if (process.argv[1] && process.argv[1].endsWith('migrateTechnicianPayouts.js')) {
  migrateTechnicianPayouts()
    .then(() => {
      console.log('🎉 Migration script completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
