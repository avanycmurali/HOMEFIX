import crypto from 'crypto';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';
import { verifyRazorpayPaymentSignature } from '../services/razorpayService.js';

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

async function runRazorpayPaymentTests() {
  console.log('🧪 Starting HOMEFIX Module: Payment Tests (Demo & Razorpay Modes)...\n');
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
  const secretKey = process.env.RAZORPAY_KEY_SECRET || 'your_test_secret';

  try {
    // 0. Initial Cleanup of dynamic test artifacts
    await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Razorpay Test%')");
    await pool.query("DELETE FROM service_status_logs WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Razorpay Test%')");
    await pool.query("DELETE FROM technician_recommendations WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Razorpay Test%')");
    await pool.query("DELETE FROM bookings WHERE problem_title LIKE 'Razorpay Test%'");
    await pool.query("DELETE FROM technician_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_pay_%')");
    await pool.query("DELETE FROM users WHERE email LIKE 'test_pay_%'");

    // 1. Setup Actors: Owner Customer, Non-Owner Customer, Technician, Admin
    console.log('--- Setting Up Actors ---');
    // Owner Customer
    const ownerEmail = `test_pay_owner_${timestamp}@homefix.com`;
    const regOwner = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Razorpay Test Owner',
        email: ownerEmail,
        password: 'Password@123',
        phone: '9888811111',
        role: 'user',
        city: 'Bangalore',
        pincode: '560034',
        address: '100 Test St, Bangalore',
      }),
    });
    assert(regOwner.ok && regOwner.data.token, 'Owner customer registered');
    const ownerToken = regOwner.data.token;
    const ownerUser = regOwner.data.user;

    // Non-owner Customer
    const otherEmail = `test_pay_other_${timestamp}@homefix.com`;
    const regOther = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Razorpay Test Other User',
        email: otherEmail,
        password: 'Password@123',
        phone: '9888822222',
        role: 'user',
        city: 'Bangalore',
        pincode: '560034',
        address: '200 Test St, Bangalore',
      }),
    });
    assert(regOther.ok && regOther.data.token, 'Other customer registered');
    const otherToken = regOther.data.token;

    // Technician
    const techEmail = `test_pay_tech_${timestamp}@homefix.com`;
    const regTech = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Razorpay Test Tech',
        email: techEmail,
        password: 'Password@123',
        phone: '9888833333',
        service_id: 1,
        experience_years: 5,
        hourly_rate: 350,
        visiting_charges: 150,
        city: 'Bangalore',
        pincode: '560034',
        service_area: 'Bangalore Central',
      }),
    });
    assert(regTech.ok && regTech.data.token, 'Technician registered');
    const techToken = regTech.data.token;
    const techProfile = regTech.data.technicianProfile;
    await pool.query("UPDATE technician_profiles SET verification_status = 'verified' WHERE id = ?", [techProfile.id]);

    // Admin login
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@homefix.com', password: 'Admin@123' }),
    });
    assert(adminLogin.ok && adminLogin.data.token, 'Admin logged in');
    const adminToken = adminLogin.data.token;

    // 2. Setup Bookings for various lifecycle stages
    console.log('\n--- Setting Up Lifecycle Bookings ---');
    // Pending Booking
    const pendingRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        service_id: 1,
        problem_title: 'Razorpay Test - Pending Booking',
        problem_description: 'Pending booking payment check',
        service_address: '100 Test St',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-09-28',
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'medium',
      }),
    });
    assert(pendingRes.ok, 'Created pending booking');
    const pendingBookingId = pendingRes.data.booking.id;

    // Accepted Booking
    const acceptedRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        service_id: 1,
        problem_title: 'Razorpay Test - Accepted Booking',
        problem_description: 'Accepted booking payment check',
        service_address: '100 Test St',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-09-28',
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'medium',
      }),
    });
    const acceptedBookingId = acceptedRes.data.booking.id;
    await api(`/bookings/${acceptedBookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ technician_id: techProfile.id }),
    });
    await api(`/bookings/${acceptedBookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
    });

    // In-Progress Booking
    const inProgressRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        service_id: 1,
        problem_title: 'Razorpay Test - In Progress Booking',
        problem_description: 'In progress booking payment check',
        service_address: '100 Test St',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-09-28',
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'medium',
      }),
    });
    const inProgressBookingId = inProgressRes.data.booking.id;
    await api(`/bookings/${inProgressBookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ technician_id: techProfile.id }),
    });
    await api(`/bookings/${inProgressBookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
    });
    await api(`/bookings/${inProgressBookingId}/start-service`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
    });

    // Completed Booking
    const completedRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        service_id: 1,
        problem_title: 'Razorpay Test - Completed Booking',
        problem_description: 'Completed booking payment check',
        service_address: '100 Test St',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-09-28',
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'medium',
      }),
    });
    const completedBookingId = completedRes.data.booking.id;
    await api(`/bookings/${completedBookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ technician_id: techProfile.id }),
    });
    await api(`/bookings/${completedBookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
    });
    await api(`/bookings/${completedBookingId}/start-service`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
    });
    await api(`/bookings/${completedBookingId}/mark-completed`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({ service_notes: 'Service successfully finished.' }),
    });

    console.log('\n--- Payment Module Tests (Security, Lifecycle, Demo Mode) ---');

    // Test 1: Unauthenticated request rejected (401)
    const test1 = await api(`/bookings/${completedBookingId}/payment/order`, {
      method: 'POST',
    });
    assert(test1.status === 401, 'Test 1: Unauthenticated request rejected with 401');

    // Test 2: Non-owner customer rejected (403)
    const test2 = await api(`/bookings/${completedBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert(test2.status === 403, 'Test 2: Non-owner customer rejected with 403');

    // Test 3: Technician cannot create customer payment (403)
    const test3 = await api(`/bookings/${completedBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert(test3.status === 403, 'Test 3: Technician cannot create customer payment (403)');

    // Test 4: Admin cannot impersonate booking owner to pay (403)
    const test4 = await api(`/bookings/${completedBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(test4.status === 403, 'Test 4: Admin cannot impersonate booking owner to pay (403)');

    // Test 5: Nonexistent booking rejected (404)
    const test5 = await api('/bookings/9999999/payment/order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(test5.status === 404, 'Test 5: Nonexistent booking rejected with 404');

    // Test 6: Pending booking cannot be paid (400)
    const test6 = await api(`/bookings/${pendingBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(test6.status === 400, 'Test 6: Pending booking cannot be paid (400)');

    // Test 7: Accepted booking cannot be paid (400)
    const test7 = await api(`/bookings/${acceptedBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(test7.status === 400, 'Test 7: Accepted booking cannot be paid (400)');

    // Test 8: In-progress booking cannot be paid (400)
    const test8 = await api(`/bookings/${inProgressBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(test8.status === 400, 'Test 8: In-progress booking cannot be paid (400)');

    // Test 9: Completed booking can create payment order (200)
    const test9 = await api(`/bookings/${completedBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(test9.status === 200 && test9.data.success && test9.data.order_id, 'Test 9: Completed booking can create order (200)');
    const createdOrderId = test9.data.order_id;
    const createdAmount = test9.data.amount;

    // Test Demo Mode Specific Properties
    assert(
      test9.data.payment_mode === 'demo' || test9.data.payment_mode === 'razorpay',
      `Test 9b: Valid payment_mode returned: "${test9.data.payment_mode}"`
    );

    // Fetch booking details to verify calculation
    const [bRows] = await pool.query('SELECT final_cost, estimated_cost FROM bookings WHERE id = ?', [completedBookingId]);
    const expectedCost = parseFloat(bRows[0].final_cost || bRows[0].estimated_cost);
    const expectedPaise = Math.round(expectedCost * 100);

    // Test 10: Correct amount sent (in paise)
    assert(createdAmount === expectedPaise && createdAmount > 0, `Test 10: Correct amount in paise (${createdAmount} paise = ₹${expectedCost})`);

    // Test 11: INR currency used
    assert(test9.data.currency === 'INR', 'Test 11: INR currency used in order creation response');

    // Test 12: Order ID stored in payments table with pending status
    const [payRows] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [completedBookingId]);
    assert(
      payRows.length > 0 &&
      payRows[0].razorpay_order_id === createdOrderId &&
      payRows[0].payment_status === 'pending',
      'Test 12: Order ID stored in payments table with pending status'
    );

    // Test 14: Invalid signature rejected (400)
    const test14 = await api(`/bookings/${completedBookingId}/payment/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: 'pay_test_fake_12345',
        razorpay_signature: 'invalid_tampered_signature_99999',
      }),
    });
    assert(test14.status === 400 && !test14.data.success, 'Test 14: Invalid signature rejected with 400');

    // Test 15: Valid payment verification accepted (200)
    const validDemoPaymentId = `pay_demo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const test15 = await api(`/bookings/${completedBookingId}/payment/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: validDemoPaymentId,
        razorpay_signature: 'demo_verified_signature',
      }),
    });
    assert(test15.status === 200 && test15.data.success, 'Test 15: Valid payment verification accepted with 200');

    // Test 16: Payment ID stored
    const [verifiedPayRows] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [completedBookingId]);
    assert(
      verifiedPayRows.length > 0 && verifiedPayRows[0].razorpay_payment_id === validDemoPaymentId,
      'Test 16: Demo/Razorpay Payment ID stored in payments table'
    );

    // Test 17: Signature stored
    assert(
      verifiedPayRows.length > 0 && verifiedPayRows[0].razorpay_signature !== null,
      'Test 17: Verified signature stored in payments table'
    );

    // Test 18: Payment status changes to paid
    assert(
      verifiedPayRows.length > 0 &&
      verifiedPayRows[0].payment_status === 'paid' &&
      verifiedPayRows[0].paid_at !== null,
      'Test 18: Payment status changes to paid with paid_at timestamp'
    );

    // Test 13: Duplicate successful payment rejected (400)
    const test13Order = await api(`/bookings/${completedBookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const test13Verify = await api(`/bookings/${completedBookingId}/payment/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: validDemoPaymentId,
        razorpay_signature: 'demo_verified_signature',
      }),
    });
    assert(
      test13Order.status === 400 && test13Verify.status === 400,
      'Test 13: Duplicate successful payment rejected with 400 on both order and verify'
    );

    // Test 19: Payment retrieval works (GET /api/bookings/:id/payment)
    const test19Owner = await api(`/bookings/${completedBookingId}/payment`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const test19Admin = await api(`/bookings/${completedBookingId}/payment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const test19Unauthorized = await api(`/bookings/${completedBookingId}/payment`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert(
      test19Owner.status === 200 &&
      test19Owner.data.payment?.payment_status === 'paid' &&
      test19Admin.status === 200 &&
      test19Unauthorized.status === 403,
      'Test 19: Payment retrieval works for owner and admin, blocks unauthorized customer'
    );

    // Test 20: Secret is never returned in API response
    const orderResponseStr = JSON.stringify(test9.data);
    const verifyResponseStr = JSON.stringify(test15.data);
    const getPaymentResponseStr = JSON.stringify(test19Owner.data);
    const secretExposed =
      orderResponseStr.includes(secretKey) ||
      verifyResponseStr.includes(secretKey) ||
      getPaymentResponseStr.includes(secretKey) ||
      orderResponseStr.toLowerCase().includes('secret') ||
      verifyResponseStr.toLowerCase().includes('secret') ||
      getPaymentResponseStr.toLowerCase().includes('secret');
    assert(!secretExposed, 'Test 20: Secret is never exposed in any API response or payload');

    // Test 21: Preserved Razorpay HMAC-SHA256 signature verification helper functions
    const mockRzpOrderId = 'order_test_999';
    const mockRzpPayId = 'pay_test_888';
    const validHmac = crypto
      .createHmac('sha256', secretKey)
      .update(`${mockRzpOrderId}|${mockRzpPayId}`)
      .digest('hex');
    const checkHmacValid = verifyRazorpayPaymentSignature({
      order_id: mockRzpOrderId,
      payment_id: mockRzpPayId,
      signature: validHmac,
    });
    const checkHmacInvalid = verifyRazorpayPaymentSignature({
      order_id: mockRzpOrderId,
      payment_id: mockRzpPayId,
      signature: 'invalid_tampered_hmac_hash',
    });
    assert(
      checkHmacValid === true && checkHmacInvalid === false,
      'Test 21: Razorpay cryptographic HMAC-SHA256 signature verification preserved for PAYMENT_MODE=razorpay'
    );

    // Teardown: Clean up test records
    await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Razorpay Test%')");
    await pool.query("DELETE FROM service_status_logs WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Razorpay Test%')");
    await pool.query("DELETE FROM technician_recommendations WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Razorpay Test%')");
    await pool.query("DELETE FROM bookings WHERE problem_title LIKE 'Razorpay Test%'");
    await pool.query("DELETE FROM technician_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_pay_%')");
    await pool.query("DELETE FROM users WHERE email LIKE 'test_pay_%'");

  } catch (err) {
    console.error('Unexpected error during payment tests:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`Payment Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRazorpayPaymentTests();
