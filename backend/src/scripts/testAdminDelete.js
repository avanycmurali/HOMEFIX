import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5000/api';

async function runDeleteTests() {
  console.log('🧪 Starting HOMEFIX Admin Delete Customer & Technician API Tests...\n');
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
    // 1. Admin Login
    console.log('--- 1. Admin Authentication ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@homefix.com', password: 'Admin@123', expectedRole: 'admin' }),
    }).then((r) => r.json());

    assert(adminLoginRes.success && adminLoginRes.token, 'Admin logged in and retrieved JWT');
    const adminToken = adminLoginRes.token;

    // 2. Setup Test Customer
    console.log('\n--- 2. Customer Deletion Workflow ---');
    const timestamp = Date.now();
    const testCustEmail = `test_delete_cust_${timestamp}@homefix.com`;
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    const [custResult] = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, city, pincode, status) 
       VALUES ('Temporary Delete Customer', ?, ?, '9111222333', 'user', 'Bangalore', '560001', 'active')`,
      [testCustEmail, hashedPassword]
    );
    const testCustId = custResult.insertId;
    assert(testCustId > 0, `Created temporary test customer (ID: ${testCustId})`);

    // Delete customer via API
    const deleteCustRes = await fetch(`${BASE_URL}/admin/customers/${testCustId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    assert(deleteCustRes.success, 'Admin successfully deleted customer via DELETE /api/admin/customers/:id');
    
    // Verify deleted in MySQL
    const [custDbRows] = await pool.query('SELECT * FROM users WHERE id = ?', [testCustId]);
    assert(custDbRows.length === 0, 'Customer record completely removed from users table in MySQL');

    // Verify audit log
    const [custLogs] = await pool.query(
      "SELECT * FROM admin_logs WHERE action_type = 'customer_deleted' AND target_id = ?",
      [testCustId]
    );
    assert(custLogs.length > 0, 'Customer deletion recorded in admin_logs');

    // 3. Setup Test Technician
    console.log('\n--- 3. Technician Deletion Workflow ---');
    const testTechEmail = `test_delete_tech_${timestamp}@homefix.com`;
    const [techUserRes] = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, city, pincode, status) 
       VALUES ('Temporary Delete Tech', ?, ?, '9222333444', 'technician', 'Bangalore', '560001', 'active')`,
      [testTechEmail, hashedPassword]
    );
    const testTechUserId = techUserRes.insertId;

    const [techProfRes] = await pool.query(
      `INSERT INTO technician_profiles (user_id, service_id, experience_years, hourly_rate, visiting_charges, city, pincode, verification_status) 
       VALUES (?, 1, 3, 200.00, 100.00, 'Bangalore', '560001', 'rejected')`,
      [testTechUserId]
    );
    const testTechProfId = techProfRes.insertId;
    assert(testTechUserId > 0 && testTechProfId > 0, `Created temporary test technician (User ID: ${testTechUserId}, Profile ID: ${testTechProfId})`);

    // Delete technician via API
    const deleteTechRes = await fetch(`${BASE_URL}/admin/technicians/${testTechUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    assert(deleteTechRes.success, 'Admin successfully deleted technician via DELETE /api/admin/technicians/:id');

    // Verify deleted from users & technician_profiles in MySQL
    const [techDbUser] = await pool.query('SELECT * FROM users WHERE id = ?', [testTechUserId]);
    const [techDbProf] = await pool.query('SELECT * FROM technician_profiles WHERE id = ?', [testTechProfId]);
    assert(techDbUser.length === 0, 'Technician record completely removed from users table');
    assert(techDbProf.length === 0, 'Technician profile record cascaded/removed from technician_profiles');

    // Verify audit log
    const [techLogs] = await pool.query(
      "SELECT * FROM admin_logs WHERE action_type = 'technician_deleted' AND target_id = ?",
      [testTechUserId]
    );
    assert(techLogs.length > 0, 'Technician deletion recorded in admin_logs');

    // 4. Boundary & Security Tests
    console.log('\n--- 4. Security & Error Handling ---');
    // Cannot delete admin account
    const [adminRow] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminUserId = adminRow[0]?.id;
    const deleteAdminRes = await fetch(`${BASE_URL}/admin/customers/${adminUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(deleteAdminRes.success === false, 'Blocked from deleting administrator account (HTTP 400)');

    // Non-existent customer
    const nonExistentRes = await fetch(`${BASE_URL}/admin/customers/9999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(nonExistentRes.success === false, 'Attempting to delete non-existent customer returns 404');

    // Unauthorized access without token
    const noAuthRes = await fetch(`${BASE_URL}/admin/customers/123`, {
      method: 'DELETE',
    });
    assert(noAuthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

  } catch (err) {
    console.error('Test run error:', err);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`🏁 Delete Tests: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');
    setTimeout(() => {
      process.exit(failed > 0 ? 1 : 0);
    }, 150);
  }
}

runDeleteTests();
