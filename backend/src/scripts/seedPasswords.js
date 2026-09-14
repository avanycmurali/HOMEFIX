import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function seedPasswords() {
  console.log('🔄 Seeding real bcrypt passwords for existing demo accounts...');

  const accounts = [
    { email: 'admin@homefix.com', password: 'Admin@123', role: 'admin' },
    { email: 'user@homefix.com', password: 'User@123', role: 'user' },
    { email: 'tech.electric@homefix.com', password: 'Tech@123', role: 'technician' },
    { email: 'tech.plumber@homefix.com', password: 'Tech@123', role: 'technician' },
  ];

  try {
    for (const acc of accounts) {
      const hash = await bcrypt.hash(acc.password, 10);
      const [result] = await pool.query(
        'UPDATE users SET password = ?, status = ? WHERE email = ?',
        [hash, 'active', acc.email]
      );
      if (result.affectedRows > 0) {
        console.log(`✅ Updated password for ${acc.email} (${acc.role}) -> "${acc.password}"`);
      } else {
        console.log(`⚠️ User ${acc.email} not found in database.`);
      }
    }

    console.log('\n🎉 Password seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding passwords:', err);
    process.exit(1);
  }
}

seedPasswords();
