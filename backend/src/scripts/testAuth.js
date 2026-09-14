import { pool } from '../config/db.js';

const BASE_URL = 'http://localhost:5000/api';

// Simple fetch wrapper
async function api(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting HOMEFIX Module 1 Backend API Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Services API
    console.log('--- 1. Testing Services API ---');
    const servicesRes = await api('/services');
    assert(servicesRes.ok && servicesRes.data.data.length > 0, `GET /api/services returned ${servicesRes.data.count} services`);
    const serviceId = servicesRes.data.data[0].id;

    // 2. Test Admin Login (Seed account)
    console.log('\n--- 2. Testing Admin Login ---');
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@homefix.com',
        password: 'Admin@123',
        expectedRole: 'admin',
      }),
    });
    assert(adminLogin.ok && adminLogin.data.user.role === 'admin', 'Admin login successful with expectedRole: admin');
    assert(typeof adminLogin.data.token === 'string', 'Admin received valid JWT token');

    // 3. Test Technician Login (Seed account)
    console.log('\n--- 3. Testing Technician Login ---');
    const techLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'tech.electric@homefix.com',
        password: 'Tech@123',
        expectedRole: 'technician',
      }),
    });
    assert(techLogin.ok && techLogin.data.user.role === 'technician', 'Technician login successful');
    assert(techLogin.data.technicianProfile !== null, 'Technician profile data included in login response');

    // 4. Test Role Mismatch Rejection
    console.log('\n--- 4. Testing Role Protection at Login ---');
    const mismatchLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@homefix.com',
        password: 'User@123',
        expectedRole: 'admin',
      }),
    });
    assert(mismatchLogin.status === 403, 'Normal user rejected when attempting admin portal login (403)');

    // 5. Test Invalid Credentials
    console.log('\n--- 5. Testing Invalid Credentials ---');
    const badLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@homefix.com',
        password: 'WrongPassword123',
      }),
    });
    assert(badLogin.status === 401, 'Invalid password rejected with 401');

    // 6. Test New Customer Registration
    console.log('\n--- 6. Testing Customer Registration ---');
    const testUserEmail = `testuser_${Date.now()}@example.com`;
    const regUserRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Priya Patel',
        email: testUserEmail,
        password: 'Password@123',
        phone: '9123456780',
        city: 'Bangalore',
        pincode: '560001',
        address: '12th Cross, Indiranagar',
      }),
    });
    assert(regUserRes.ok && regUserRes.data.user.role === 'user', 'New customer registered successfully in MySQL');
    const userToken = regUserRes.data.token;
    assert(typeof userToken === 'string', 'Received JWT on user registration');

    // 7. Test Duplicate Email Registration
    console.log('\n--- 7. Testing Duplicate Email Handling ---');
    const dupRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate User',
        email: testUserEmail,
        password: 'Password@123',
        phone: '9123456780',
        city: 'Bangalore',
        pincode: '560001',
      }),
    });
    assert(dupRes.status === 409, 'Duplicate email registration rejected with 409 Conflict');

    // 8. Test New Technician Registration (Transaction across users & technician_profiles)
    console.log('\n--- 8. Testing Technician Registration ---');
    const testTechEmail = `testtech_${Date.now()}@example.com`;
    const regTechRes = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Vikram Joshi (AC Specialist)',
        email: testTechEmail,
        password: 'Password@123',
        phone: '9888877777',
        city: 'Bangalore',
        pincode: '560025',
        address: 'Brigade Road',
        service_id: serviceId,
        experience_years: 4,
        qualification: 'HVAC Certified Diploma',
        hourly_rate: 300.0,
        visiting_charges: 150.0,
        service_area: 'Central Bangalore',
        bio: 'Expert in AC repair and installation.',
      }),
    });
    assert(regTechRes.ok && regTechRes.data.user.role === 'technician', 'New technician registered in users table');
    assert(regTechRes.data.technicianProfile && regTechRes.data.technicianProfile.experience_years === 4, 'Technician profile inserted in technician_profiles table');

    // 9. Test Protected Route GET /api/auth/me
    console.log('\n--- 9. Testing Protected Route GET /api/auth/me ---');
    const meRes = await api('/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(meRes.ok && meRes.data.user.email === testUserEmail, 'GET /api/auth/me returns authenticated user details');

    // 10. Test Protected Route without token
    console.log('\n--- 10. Testing Protected Route without Token ---');
    const noAuthRes = await api('/auth/me');
    assert(noAuthRes.status === 401, 'Request rejected with 401 when token is missing');

    console.log(`\n====================================================`);
    console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
