import dotenv from 'dotenv';
import { pool } from '../config/db.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function api(endpoint, options = {}) {
  const { headers, ...restOptions } = options;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runReportTests() {
  console.log('🧪 Starting HOMEFIX Operational Reports & Security Automated Tests...\n');
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

  const timestamp = Date.now();
  const testDate = '2026-11-15';
  const emptyDate = '1995-01-01';

  try {
    // 0. Cleanup any lingering test records
    await pool.query("DELETE FROM technician_payouts WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Report Test%')");
    await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Report Test%')");
    await pool.query("DELETE FROM bookings WHERE problem_title LIKE 'Report Test%'");
    await pool.query("DELETE FROM technician_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_rep_%')");
    await pool.query("DELETE FROM users WHERE email LIKE 'test_rep_%'");

    console.log('--- 1. Setting Up Test Actors (Admin, 2 Technicians, 2 Customers) ---');

    // Admin login
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@homefix.com', password: 'Admin@123' }),
    });
    assert(adminLogin.ok && adminLogin.data.token, 'Admin account authenticated successfully');
    const adminToken = adminLogin.data.token;

    // Customer 1 (Alice)
    const cust1Email = `test_rep_cust1_${timestamp}@homefix.com`;
    const regCust1 = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Report Alice Customer',
        email: cust1Email,
        password: 'Password@123',
        phone: '9876543210',
        role: 'user',
        city: 'Bangalore',
        pincode: '560001',
        address: '101 Report Lane',
      }),
    });
    assert(regCust1.ok && regCust1.data.token, 'Customer 1 (Alice) registered');
    const cust1Token = regCust1.data.token;
    const cust1Id = regCust1.data.user.id;

    // Customer 2 (Bob)
    const cust2Email = `test_rep_cust2_${timestamp}@homefix.com`;
    const regCust2 = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Report Bob Customer',
        email: cust2Email,
        password: 'Password@123',
        phone: '9876543211',
        role: 'user',
        city: 'Bangalore',
        pincode: '560001',
        address: '102 Report Lane',
      }),
    });
    assert(regCust2.ok && regCust2.data.token, 'Customer 2 (Bob) registered');
    const cust2Token = regCust2.data.token;
    const cust2Id = regCust2.data.user.id;

    // Technician 1 (Charlie)
    const tech1Email = `test_rep_tech1_${timestamp}@homefix.com`;
    const regTech1 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Report Charlie Electrician',
        email: tech1Email,
        password: 'Password@123',
        phone: '9876543212',
        service_id: 1,
        experience_years: 5,
        hourly_rate: 350,
        visiting_charges: 100,
        city: 'Bangalore',
        pincode: '560001',
        service_area: 'Central Bangalore',
      }),
    });
    assert(regTech1.ok && regTech1.data.token, 'Technician 1 (Charlie) registered');
    const tech1Token = regTech1.data.token;
    const tech1ProfileId = regTech1.data.technicianProfile?.id;
    const tech1UserId = regTech1.data.user.id;

    // Technician 2 (Dave)
    const tech2Email = `test_rep_tech2_${timestamp}@homefix.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Report Dave Plumber',
        email: tech2Email,
        password: 'Password@123',
        phone: '9876543213',
        service_id: 2,
        experience_years: 7,
        hourly_rate: 400,
        visiting_charges: 150,
        city: 'Bangalore',
        pincode: '560001',
        service_area: 'Central Bangalore',
      }),
    });
    assert(regTech2.ok && regTech2.data.token, 'Technician 2 (Dave) registered');
    const tech2Token = regTech2.data.token;
    const tech2ProfileId = regTech2.data.technicianProfile?.id;
    const tech2UserId = regTech2.data.user.id;

    // Verify both technicians via Admin
    await api(`/admin/technicians/${tech1ProfileId}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ verification_status: 'verified' }),
    });
    await api(`/admin/technicians/${tech2ProfileId}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ verification_status: 'verified' }),
    });

    console.log('\n--- 2. Creating Sample Bookings for Test Date:', testDate, '---');

    // Booking 1: Customer 1 booked with Tech 1 -> Completed + Paid
    const [b1Result] = await pool.query(
      `INSERT INTO bookings (
        booking_reference, user_id, service_id, technician_id,
        problem_title, problem_description, service_address, city, pincode,
        scheduled_date, scheduled_time_slot, booking_status,
        estimated_cost, final_cost, completed_at, created_at
      ) VALUES (
        ?, ?, 1, ?,
        'Report Test - Flickering Living Room Lights',
        'Main hall ceiling chandelier flickering intermittently',
        '101 Report Lane', 'Bangalore', '560001',
        ?, '10:00 AM - 12:00 PM', 'completed',
        350.00, 450.00, CONCAT(?, ' 11:30:00'), CONCAT(?, ' 09:00:00')
      )`,
      [`HF-REP1-${timestamp}`, cust1Id, tech1ProfileId, testDate, testDate, testDate]
    );
    const booking1Id = b1Result.insertId;

    // Payment for Booking 1
    const [p1Result] = await pool.query(
      `INSERT INTO payments (
        booking_id, user_id, amount, currency, payment_method, payment_status, paid_at
      ) VALUES (
        ?, ?, 450.00, 'INR', 'demo', 'paid', CONCAT(?, ' 11:45:00')
      )`,
      [booking1Id, cust1Id, testDate]
    );
    const payment1Id = p1Result.insertId;

    // Technician Payout for Booking 1 (450 gross - 45 fee = 405 net)
    await pool.query(
      `INSERT INTO technician_payouts (
        booking_id, technician_id, payment_id, gross_amount, platform_fee, technician_amount, payout_status, paid_at, created_at
      ) VALUES (
        ?, ?, ?, 450.00, 45.00, 405.00, 'paid', CONCAT(?, ' 12:00:00'), CONCAT(?, ' 11:50:00')
      )`,
      [booking1Id, tech1UserId, payment1Id, testDate, testDate]
    );

    // Booking 2: Customer 2 booked with Tech 2 -> Completed + Pending Payout
    const [b2Result] = await pool.query(
      `INSERT INTO bookings (
        booking_reference, user_id, service_id, technician_id,
        problem_title, problem_description, service_address, city, pincode,
        scheduled_date, scheduled_time_slot, booking_status,
        estimated_cost, final_cost, completed_at, created_at
      ) VALUES (
        ?, ?, 2, ?,
        'Report Test - Kitchen Sink Pipe Leakage',
        'Heavy leaking beneath kitchen sink drain pipe',
        '102 Report Lane', 'Bangalore', '560001',
        ?, '02:00 PM - 04:00 PM', 'completed',
        400.00, 600.00, CONCAT(?, ' 15:30:00'), CONCAT(?, ' 13:00:00')
      )`,
      [`HF-REP2-${timestamp}`, cust2Id, tech2ProfileId, testDate, testDate, testDate]
    );
    const booking2Id = b2Result.insertId;

    // Payment for Booking 2
    const [p2Result] = await pool.query(
      `INSERT INTO payments (
        booking_id, user_id, amount, currency, payment_method, payment_status, paid_at
      ) VALUES (
        ?, ?, 600.00, 'INR', 'demo', 'paid', CONCAT(?, ' 15:45:00')
      )`,
      [booking2Id, cust2Id, testDate]
    );
    const payment2Id = p2Result.insertId;

    // Payout for Booking 2 (600 gross - 60 fee = 540 net)
    await pool.query(
      `INSERT INTO technician_payouts (
        booking_id, technician_id, payment_id, gross_amount, platform_fee, technician_amount, payout_status, created_at
      ) VALUES (
        ?, ?, ?, 600.00, 60.00, 540.00, 'pending', CONCAT(?, ' 15:50:00')
      )`,
      [booking2Id, tech2UserId, payment2Id, testDate]
    );

    // Booking 3: Customer 1 has another pending booking on test date
    const [b3Result] = await pool.query(
      `INSERT INTO bookings (
        booking_reference, user_id, service_id, technician_id,
        problem_title, problem_description, service_address, city, pincode,
        scheduled_date, scheduled_time_slot, booking_status,
        estimated_cost, created_at
      ) VALUES (
        ?, ?, 1, NULL,
        'Report Test - Circuit Breaker Tripping',
        'Air conditioner causes main MCB to trip',
        '101 Report Lane', 'Bangalore', '560001',
        ?, '05:00 PM - 07:00 PM', 'pending',
        300.00, CONCAT(?, ' 16:00:00')
      )`,
      [`HF-REP3-${timestamp}`, cust1Id, testDate, testDate]
    );

    console.log('Sample bookings created successfully.');

    // =========================================================================
    // 3. ADMIN REPORT TESTS
    // =========================================================================
    console.log('\n--- 3. Testing Admin Reports ---');

    // 3a. Admin: Technician Work Report for testDate
    const adminTechRep = await api(`/admin/reports/technician-work?date=${testDate}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminTechRep.ok && adminTechRep.data.success, 'Admin can fetch technician work report');
    assert(adminTechRep.data.data.summary.total_completed_services >= 2, `Admin report lists completed services (Found: ${adminTechRep.data.data.summary.total_completed_services})`);
    assert(parseFloat(adminTechRep.data.data.summary.total_service_amount) >= 1050, `Admin report service amount matches (Found: ₹${adminTechRep.data.data.summary.total_service_amount})`);
    assert(parseFloat(adminTechRep.data.data.summary.total_technician_payout) >= 945, `Admin report technician payout matches (Found: ₹${adminTechRep.data.data.summary.total_technician_payout})`);

    const r1 = adminTechRep.data.data.records.find((r) => r.booking_id === booking1Id);
    assert(r1 && r1.technician_name === 'Report Charlie Electrician', 'Technician Work Report includes technician name');
    assert(r1 && r1.customer_name === 'Report Alice Customer', 'Technician Work Report includes customer name');
    assert(r1 && r1.booking_code === `HF-REP1-${timestamp}`, 'Technician Work Report includes booking code');
    assert(r1 && r1.completion_status === 'Completed', 'Technician Work Report includes completion status');
    assert(r1 && parseFloat(r1.service_amount) === 450.00, 'Technician Work Report includes service amount');
    assert(r1 && parseFloat(r1.technician_payout) === 405.00, 'Technician Work Report includes technician payout');

    // 3b. Admin: Customer Activity Report for testDate
    const adminCustRep = await api(`/admin/reports/customer-activity?date=${testDate}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCustRep.ok && adminCustRep.data.success, 'Admin can fetch customer activity report');
    assert(adminCustRep.data.data.summary.total_bookings >= 3, `Admin customer report lists all bookings on date (Found: ${adminCustRep.data.data.summary.total_bookings})`);
    assert(parseFloat(adminCustRep.data.data.summary.total_amount) >= 1350, `Admin customer report total amount matches (Found: ₹${adminCustRep.data.data.summary.total_amount})`);

    const cr1 = adminCustRep.data.data.records.find((r) => r.booking_id === booking1Id);
    assert(cr1 && cr1.customer_id === cust1Id, 'Customer Activity Report includes customer ID');
    assert(cr1 && cr1.assigned_technician === 'Report Charlie Electrician', 'Customer Activity Report includes assigned technician');
    assert(cr1 && cr1.payment_status === 'paid', 'Customer Activity Report includes payment status');

    // 3c. Admin: Date with no records
    const adminEmptyRep = await api(`/admin/reports/technician-work?date=${emptyDate}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminEmptyRep.ok && adminEmptyRep.data.data.records.length === 0, 'Admin report for empty date returns 0 records');
    assert(adminEmptyRep.data.data.summary.total_completed_services === 0, 'Admin report for empty date shows total_completed_services = 0');

    // =========================================================================
    // 4. TECHNICIAN REPORT TESTS & ISOLATION
    // =========================================================================
    console.log('\n--- 4. Testing Technician Reports & Strict Data Isolation ---');

    // 4a. Technician 1 generates report for testDate
    const tech1Rep = await api(`/technician/reports/work?date=${testDate}`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(tech1Rep.ok && tech1Rep.data.success, 'Technician 1 can fetch their own work report');
    assert(tech1Rep.data.data.summary.total_jobs_completed === 1, `Technician 1 completed jobs summary is 1 (Found: ${tech1Rep.data.data.summary.total_jobs_completed})`);
    assert(parseFloat(tech1Rep.data.data.summary.total_earnings) === 405.00, `Technician 1 earnings summary is 405.00 (Found: ₹${tech1Rep.data.data.summary.total_earnings})`);

    const tr1 = tech1Rep.data.data.records.find((r) => r.booking_id === booking1Id);
    assert(tr1 && tr1.technician_name === 'Report Charlie Electrician', 'Technician report shows technician name');
    assert(tr1 && tr1.customer_name === 'Report Alice Customer', 'Technician report shows customer name');
    assert(tr1 && tr1.completion_status === 'Completed', 'Technician report shows completion status');
    assert(tr1 && parseFloat(tr1.technician_payout) === 405.00, 'Technician report shows technician net payout');

    // 4b. Strict isolation: Technician 1 CANNOT see Technician 2's job
    const tech1SeesTech2 = tech1Rep.data.data.records.some((r) => r.booking_id === booking2Id);
    assert(!tech1SeesTech2, 'Security check: Technician 1 cannot see Technician 2 records in report');

    // 4c. Technician 2 generates report for testDate
    const tech2Rep = await api(`/technician/reports/work?date=${testDate}`, {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(tech2Rep.ok && tech2Rep.data.success, 'Technician 2 can fetch their own work report');
    assert(parseFloat(tech2Rep.data.data.summary.total_earnings) === 540.00, `Technician 2 earnings summary is 540.00 (Found: ₹${tech2Rep.data.data.summary.total_earnings})`);
    const tech2SeesTech1 = tech2Rep.data.data.records.some((r) => r.booking_id === booking1Id);
    assert(!tech2SeesTech1, 'Security check: Technician 2 cannot see Technician 1 records in report');

    // 4d. Technician: Date with no records
    const techEmptyRep = await api(`/technician/reports/work?date=${emptyDate}`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(techEmptyRep.ok && techEmptyRep.data.data.records.length === 0, 'Technician report for empty date returns 0 records');
    assert(techEmptyRep.data.data.summary.total_jobs_completed === 0, 'Technician report for empty date shows 0 completed jobs');

    // 4e. Unauthorized role check: Customer cannot access technician report
    const custAccessTech = await api(`/technician/reports/work?date=${testDate}`, {
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    assert(custAccessTech.status === 403, 'Role guard: Customer cannot access technician reports endpoint (403 Forbidden)');

    // =========================================================================
    // 5. CUSTOMER REPORT TESTS & ISOLATION
    // =========================================================================
    console.log('\n--- 5. Testing Customer Reports & Strict Data Isolation ---');

    // 5a. Customer 1 generates report for testDate
    const cust1Rep = await api(`/bookings/reports/customer?date=${testDate}`, {
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    assert(cust1Rep.ok && cust1Rep.data.success, 'Customer 1 can fetch their own complaints report');
    assert(cust1Rep.data.data.summary.total_complaints === 2, `Customer 1 total complaints is 2 (Found: ${cust1Rep.data.data.summary.total_complaints})`);
    assert(cust1Rep.data.data.summary.completed_complaints === 1, `Customer 1 completed complaints is 1 (Found: ${cust1Rep.data.data.summary.completed_complaints})`);
    assert(cust1Rep.data.data.summary.pending_complaints === 1, `Customer 1 pending complaints is 1 (Found: ${cust1Rep.data.data.summary.pending_complaints})`);

    const c1r1 = cust1Rep.data.data.records.find((r) => r.booking_id === booking1Id);
    assert(c1r1 && c1r1.customer_name === 'Report Alice Customer', 'Customer report includes customer name');
    assert(c1r1 && c1r1.booking_code === `HF-REP1-${timestamp}`, 'Customer report includes booking code');
    assert(c1r1 && c1r1.assigned_technician === 'Report Charlie Electrician', 'Customer report includes assigned technician');
    assert(c1r1 && c1r1.scheduled_date === testDate, 'Customer report includes scheduled date');
    assert(c1r1 && c1r1.booking_status === 'completed', 'Customer report includes booking status');
    assert(c1r1 && c1r1.payment_status === 'paid', 'Customer report includes payment status');
    assert(c1r1 && parseFloat(c1r1.amount) === 450.00, 'Customer report includes amount');

    // 5b. Strict isolation: Customer 1 CANNOT see Customer 2's complaints
    const cust1SeesCust2 = cust1Rep.data.data.records.some((r) => r.booking_id === booking2Id);
    assert(!cust1SeesCust2, 'Security check: Customer 1 cannot see Customer 2 complaints/bookings');

    // 5c. Customer 2 generates report for testDate
    const cust2Rep = await api(`/bookings/reports/customer?date=${testDate}`, {
      headers: { Authorization: `Bearer ${cust2Token}` },
    });
    assert(cust2Rep.ok && cust2Rep.data.success, 'Customer 2 can fetch their own complaints report');
    assert(cust2Rep.data.data.summary.total_complaints === 1, `Customer 2 total complaints is 1 (Found: ${cust2Rep.data.data.summary.total_complaints})`);
    const cust2SeesCust1 = cust2Rep.data.data.records.some((r) => r.booking_id === booking1Id);
    assert(!cust2SeesCust1, 'Security check: Customer 2 cannot see Customer 1 complaints/bookings');

    // 5d. Customer: Date with no records
    const custEmptyRep = await api(`/bookings/reports/customer?date=${emptyDate}`, {
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    assert(custEmptyRep.ok && custEmptyRep.data.data.records.length === 0, 'Customer report for empty date returns 0 records');
    assert(custEmptyRep.data.data.summary.total_complaints === 0, 'Customer report for empty date shows total_complaints = 0');

    // 5e. Security check: Customer/Technician cannot access admin reports
    const custAccessAdmin = await api(`/admin/reports/technician-work?date=${testDate}`, {
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    assert(custAccessAdmin.status === 403, 'Role guard: Customer cannot access admin reports (403 Forbidden)');

    const techAccessAdmin = await api(`/admin/reports/customer-activity?date=${testDate}`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(techAccessAdmin.status === 403, 'Role guard: Technician cannot access admin reports (403 Forbidden)');

    // 5f. Input validation check: Invalid date format returns 400
    const invalidDateRes = await api('/admin/reports/technician-work?date=not-a-date', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidDateRes.status === 400, 'Validation: Invalid date format returns 400 Bad Request');

    // 6. Cleanup test records
    console.log('\n--- 6. Cleaning Up Test Data ---');
    await pool.query("DELETE FROM technician_payouts WHERE booking_id IN (?, ?)", [booking1Id, booking2Id]);
    await pool.query("DELETE FROM payments WHERE booking_id IN (?, ?)", [booking1Id, booking2Id]);
    await pool.query("DELETE FROM bookings WHERE id IN (?, ?, ?)", [booking1Id, booking2Id, b3Result.insertId]);
    await pool.query("DELETE FROM technician_profiles WHERE id IN (?, ?)", [tech1ProfileId, tech2ProfileId]);
    await pool.query("DELETE FROM users WHERE id IN (?, ?, ?, ?)", [cust1Id, cust2Id, tech1UserId, tech2UserId]);
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`📊 Reports Test Suite Summary:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runReportTests();
