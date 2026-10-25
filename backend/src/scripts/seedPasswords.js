import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function seedPasswords() {
  console.log('🔄 Ensuring demo & seed accounts exist with verified passwords...');

  const accounts = [
    {
      name: 'System Administrator',
      email: 'admin@homefix.com',
      password: 'Admin@123',
      phone: '9876543210',
      role: 'admin',
      city: 'Bangalore',
      pincode: '560001',
    },
    {
      name: 'Rahul Sharma',
      email: 'user@homefix.com',
      password: 'User@123',
      phone: '9876543211',
      role: 'user',
      city: 'Bangalore',
      pincode: '560034',
    },
    {
      name: 'Amit Verma (Electrician)',
      email: 'tech.electric@homefix.com',
      password: 'Tech@123',
      phone: '9876543212',
      role: 'technician',
      city: 'Bangalore',
      pincode: '560034',
      profile: {
        service_id: 1,
        experience_years: 5,
        qualification: 'Certified Electrician (ITI Electrical)',
        hourly_rate: 250.00,
        visiting_charges: 150.00,
        service_area: 'Koramangala / Indiranagar',
        city: 'Bangalore',
        pincode: '560034',
        latitude: 12.93520000,
        longitude: 77.62450000,
        average_rating: 4.80,
        total_reviews: 42,
        total_jobs_completed: 65,
        availability_status: 'available',
        verification_status: 'verified',
        bio: 'Experienced residential electrician specializing in wiring and circuit repairs.',
      },
    },
    {
      name: 'Suresh Kumar (Plumber)',
      email: 'tech.plumber@homefix.com',
      password: 'Tech@123',
      phone: '9876543213',
      role: 'technician',
      city: 'Bangalore',
      pincode: '560038',
      profile: {
        service_id: 2,
        experience_years: 7,
        qualification: 'Licensed Master Plumber',
        hourly_rate: 200.00,
        visiting_charges: 120.00,
        service_area: 'Indiranagar / Domlur',
        city: 'Bangalore',
        pincode: '560038',
        latitude: 12.97840000,
        longitude: 77.64080000,
        average_rating: 4.60,
        total_reviews: 38,
        total_jobs_completed: 52,
        availability_status: 'available',
        verification_status: 'verified',
        bio: 'Expert in leak detection, bathroom fixtures, and emergency pipe repairs.',
      },
    },
  ];

  try {
    for (const acc of accounts) {
      const hash = await bcrypt.hash(acc.password, 10);
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [acc.email]);

      let userId;
      if (existing.length > 0) {
        userId = existing[0].id;
        await pool.query(
          'UPDATE users SET password = ?, status = ? WHERE id = ?',
          [hash, 'active', userId]
        );
        console.log(`✅ Updated password for ${acc.email} (${acc.role}) -> "${acc.password}"`);
      } else {
        const [insertRes] = await pool.query(
          'INSERT INTO users (name, email, password, phone, role, city, pincode, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [acc.name, acc.email, hash, acc.phone, acc.role, acc.city, acc.pincode, 'active']
        );
        userId = insertRes.insertId;
        console.log(`✅ Created user ${acc.email} with ID #${userId}`);
      }

      if (acc.profile) {
        const [existingProf] = await pool.query('SELECT id FROM technician_profiles WHERE user_id = ?', [userId]);
        if (existingProf.length === 0) {
          const p = acc.profile;
          await pool.query(
            `INSERT INTO technician_profiles 
             (user_id, service_id, experience_years, qualification, hourly_rate, visiting_charges, service_area, city, pincode, latitude, longitude, average_rating, total_reviews, total_jobs_completed, availability_status, verification_status, bio)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              p.service_id,
              p.experience_years,
              p.qualification,
              p.hourly_rate,
              p.visiting_charges,
              p.service_area,
              p.city,
              p.pincode,
              p.latitude,
              p.longitude,
              p.average_rating,
              p.total_reviews,
              p.total_jobs_completed,
              p.availability_status,
              p.verification_status,
              p.bio,
            ]
          );
          console.log(`  -> Created technician profile for user #${userId}`);
        } else {
          await pool.query(
            'UPDATE technician_profiles SET verification_status = ?, availability_status = ? WHERE user_id = ?',
            ['verified', 'available', userId]
          );
        }
      }
    }

    console.log('\n🎉 Seed accounts ready and verified!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding passwords:', err);
    process.exit(1);
  }
}

seedPasswords();
