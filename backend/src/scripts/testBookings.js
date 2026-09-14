import { pool } from '../config/db.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function runBookingTests() {
  console.log('🧪 Starting HOMEFIX Module 2 Backend API Tests...\n');
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
    // 1. Log in as Customer
    console.log('--- 1. Customer Authentication ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@homefix.com', password: 'User@123' }),
    }).then((r) => r.json());

    assert(loginRes.success && loginRes.token, 'Customer logged in and obtained JWT');
    const customerToken = loginRes.token;

    // 2. Fetch available services
    const servicesRes = await fetch(`${BASE_URL}/services`).then((r) => r.json());
    assert(servicesRes.success && servicesRes.data.length > 0, 'Active services retrieved');
    const service = servicesRes.data[0];

    // 3. Register Complaint with Photo Upload
    console.log('\n--- 2. Register Complaint / Service Booking ---');
    // Create a temporary sample image
    const tempImgPath = path.join(process.cwd(), 'temp_test_complaint.png');
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(tempImgPath, dummyPng);

    const formData = new FormData();
    formData.append('service_id', service.id);
    formData.append('problem_title', 'Master bedroom ceiling fan vibrating heavily');
    formData.append('problem_description', 'The ceiling fan makes rattling noises at speed 3 and above. Needs motor bearing check.');
    formData.append('service_address', 'Flat 402, Sunshine Apartments, 12th Main');
    formData.append('city', 'Bangalore');
    formData.append('pincode', '560034');
    formData.append('scheduled_date', '2026-09-15');
    formData.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formData.append('urgency_level', 'high');
    const blob = new Blob([dummyPng], { type: 'image/png' });
    formData.append('problem_image', blob, 'test_fan_problem.png');

    const bookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
      body: formData,
    }).then((r) => r.json());

    // Clean up temp image
    if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);

    assert(bookRes.success, 'Complaint successfully registered via POST /api/bookings');
    assert(bookRes.booking && bookRes.booking.booking_reference.startsWith('HF-'), 'Booking reference generated (HF-...)');
    assert(bookRes.booking.booking_status === 'pending', 'Initial status set to "pending"');
    assert(bookRes.booking.problem_image_url !== null, 'Complaint image uploaded and URL saved');
    const bookingId = bookRes.booking.id;

    // 4. Verify in MySQL database and check status log
    console.log('\n--- 3. Verify Database Integrity & Status Logs ---');
    const [dbBookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    assert(dbBookings.length === 1, 'Booking record found in MySQL bookings table');

    const [dbLogs] = await pool.query('SELECT * FROM service_status_logs WHERE booking_id = ?', [bookingId]);
    assert(dbLogs.length === 1 && dbLogs[0].status === 'pending', 'Status transition recorded in service_status_logs');

    // 5. Fetch Customer's Bookings
    console.log('\n--- 4. Customer My-Bookings Query ---');
    const myBookingsRes = await fetch(`${BASE_URL}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    }).then((r) => r.json());

    assert(myBookingsRes.success && myBookingsRes.count >= 1, 'Customer can retrieve personal bookings list');
    const foundBooking = myBookingsRes.data.find((b) => b.id === bookingId);
    assert(foundBooking && foundBooking.service_name === service.name, 'Booking includes joined service details');

    // 6. Fetch Booking Details by ID
    console.log('\n--- 5. Booking Details & Timeline by ID ---');
    const detailsRes = await fetch(`${BASE_URL}/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    }).then((r) => r.json());

    assert(detailsRes.success && detailsRes.booking.id === bookingId, 'Detailed booking info retrieved');
    assert(Array.isArray(detailsRes.statusHistory) && detailsRes.statusHistory.length > 0, 'Status history timeline included');

    // 7. Cancel Booking
    console.log('\n--- 6. Cancel Booking ---');
    const cancelRes = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Issue resolved by local technician' }),
    }).then((r) => r.json());

    assert(cancelRes.success, 'Booking successfully cancelled');

    const [cancelledDb] = await pool.query('SELECT booking_status, cancellation_reason FROM bookings WHERE id = ?', [bookingId]);
    assert(cancelledDb[0].booking_status === 'cancelled', 'Status updated to "cancelled" in database');

    const [logsAfterCancel] = await pool.query('SELECT * FROM service_status_logs WHERE booking_id = ? ORDER BY id DESC', [bookingId]);
    assert(logsAfterCancel[0].status === 'cancelled', 'Cancellation logged in service_status_logs');

    // 8. Admin View All Bookings
    console.log('\n--- 7. Admin Oversight ---');
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@homefix.com', password: 'Admin@123' }),
    }).then((r) => r.json());

    const allBookingsRes = await fetch(`${BASE_URL}/bookings`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    }).then((r) => r.json());
    assert(allBookingsRes.success && allBookingsRes.count >= 1, 'Admin can view all platform bookings');

    console.log(`\n====================================================`);
    console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runBookingTests();
