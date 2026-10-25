import { pool } from '../config/db.js';

async function migrate() {
  console.log('Migrating database schema for password reset...');

  // 1. Add reset_password_token to users table
  const [tokenCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_password_token'");
  if (tokenCol.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL AFTER status");
    console.log('✅ Added reset_password_token to users table.');
  } else {
    console.log('ℹ️ reset_password_token column already exists.');
  }

  // 2. Add reset_password_expires to users table
  const [expCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_password_expires'");
  if (expCol.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN reset_password_expires DATETIME NULL AFTER reset_password_token");
    console.log('✅ Added reset_password_expires to users table.');
  } else {
    console.log('ℹ️ reset_password_expires column already exists.');
  }

  // 3. Add reset_password_requested_at to users table for rate-limiting
  const [reqCol] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_password_requested_at'");
  if (reqCol.length === 0) {
    await pool.query("ALTER TABLE users ADD COLUMN reset_password_requested_at DATETIME NULL AFTER reset_password_expires");
    console.log('✅ Added reset_password_requested_at to users table.');
  } else {
    console.log('ℹ️ reset_password_requested_at column already exists.');
  }

  console.log('🎉 Password reset schema migration completed successfully!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
