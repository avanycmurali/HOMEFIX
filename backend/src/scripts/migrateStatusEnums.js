import { pool } from '../config/db.js';

async function migrate() {
  console.log('Migrating database schema for customer technician selection workflow...');
  
  // 1. Extend booking_status ENUM in bookings table
  await pool.query(`
    ALTER TABLE bookings MODIFY COLUMN booking_status ENUM(
      'pending',
      'technician_assigned',
      'customer_selected_technician',
      'accepted',
      'technician_rejected',
      'in_progress',
      'completed',
      'cancelled',
      'rejected'
    ) DEFAULT 'pending'
  `);
  console.log('✅ bookings table booking_status ENUM updated successfully.');

  // 2. Extend status ENUM in service_status_logs table
  await pool.query(`
    ALTER TABLE service_status_logs MODIFY COLUMN status ENUM(
      'pending',
      'technician_assigned',
      'customer_selected_technician',
      'accepted',
      'technician_rejected',
      'in_progress',
      'completed',
      'cancelled',
      'rejected'
    ) NOT NULL
  `);
  console.log('✅ service_status_logs table status ENUM updated successfully.');

  // Check if rejection_reason column exists on bookings, if not add it for easy querying
  const [cols] = await pool.query(`SHOW COLUMNS FROM bookings LIKE 'rejection_reason'`);
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE bookings ADD COLUMN rejection_reason TEXT NULL AFTER cancellation_reason`);
    console.log('✅ Added rejection_reason column to bookings table.');
  }

  // Check if service_notes column exists on bookings, if not add it
  const [serviceNotesCols] = await pool.query(`SHOW COLUMNS FROM bookings LIKE 'service_notes'`);
  if (serviceNotesCols.length === 0) {
    await pool.query(`ALTER TABLE bookings ADD COLUMN service_notes TEXT NULL AFTER rejection_reason`);
    console.log('✅ Added service_notes column to bookings table.');
  }

  // Check if completed_at column exists on bookings, if not add it
  const [completedAtCols] = await pool.query(`SHOW COLUMNS FROM bookings LIKE 'completed_at'`);
  if (completedAtCols.length === 0) {
    await pool.query(`ALTER TABLE bookings ADD COLUMN completed_at DATETIME NULL AFTER service_notes`);
    console.log('✅ Added completed_at column to bookings table.');
  }

  console.log('🎉 Schema migration completed successfully!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
