import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
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

async function runTechnicianPayoutTests() {
  console.log('🧪 Starting HOMEFIX Module: Technician Earnings & Payout Tests (All 16 Test Cases)...\n');
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
  let customerToken = '';
  let customerUserId = null;
  let techToken1 = '';
  let techUserId1 = null;
  let techProfileId1 = null;
  let techToken2 = '';
  let techUserId2 = null;
  let adminToken = '';
  let bookingId = null;
  let payoutId = null;

  try {
    // Cleanup any prior test artifacts
    await pool.query("DELETE FROM technician_payouts WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Payout Test%')");
    await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Payout Test%')");
    await pool.query("DELETE FROM bookings WHERE problem_title LIKE 'Payout Test%'");
    await pool.query("DELETE FROM technician_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_payout_%')");
    await pool.query("DELETE FROM users WHERE email LIKE 'test_payout_%'");

    console.log('--- Setting Up Actors ---');
    // 1. Customer
    const customerEmail = `test_payout_cust_${timestamp}@homefix.com`;
    const regCust = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Payout Test Customer',
        email: customerEmail,
        password: 'Password@123',
        phone: '9888800001',
        role: 'user',
        city: 'Kochi',
        pincode: '682001',
        address: '101 Marine Drive',
      }),
    });
    customerToken = regCust.data?.token;
    customerUserId = regCust.data?.user?.id;
    assert(customerToken && customerUserId, 'Customer registered and token retrieved');

    // 2. Technician 1
    const techEmail1 = `test_payout_tech1_${timestamp}@homefix.com`;
    const regTech1 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Payout Test Tech 1',
        email: techEmail1,
        password: 'Password@123',
        phone: '9888800002',
        service_id: 1, // AC Service or Electrical
        experience_years: 6,
        hourly_rate: 300,
        visiting_charges: 100,
        city: 'Kochi',
        pincode: '682001',
        service_area: 'Marine Drive',
      }),
    });
    techToken1 = regTech1.data?.token;
    techUserId1 = regTech1.data?.user?.id;
    techProfileId1 = regTech1.data?.technicianProfile?.id;
    assert(techToken1 && techUserId1 && techProfileId1, 'Technician 1 registered and token retrieved');

    // 3. Technician 2
    const techEmail2 = `test_payout_tech2_${timestamp}@homefix.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Payout Test Tech 2',
        email: techEmail2,
        password: 'Password@123',
        phone: '9888800003',
        service_id: 1,
        experience_years: 4,
        hourly_rate: 250,
        visiting_charges: 80,
        city: 'Kochi',
        pincode: '682001',
        service_area: 'Kaloor',
      }),
    });
    techToken2 = regTech2.data?.token;
    techUserId2 = regTech2.data?.user?.id;
    assert(techToken2 && techUserId2, 'Technician 2 registered and token retrieved');
    await pool.query("UPDATE technician_profiles SET verification_status = 'verified' WHERE user_id IN (?, ?)", [techUserId1, techUserId2]);

    // 4. Admin Login
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@homefix.com',
        password: 'Admin@123',
      }),
    });
    adminToken = adminLogin.data?.token;
    assert(adminToken, 'Admin logged in and token retrieved');

    console.log('\n--- Creating Test Completed Booking ---');
    // Create completed booking assigned to Technician 1 with cost ₹600.00
    const [bookingInsert] = await pool.query(
      `INSERT INTO bookings 
        (booking_reference, user_id, service_id, technician_id, problem_title, problem_description, 
         service_address, city, pincode, scheduled_date, scheduled_time_slot, booking_status, estimated_cost, final_cost, completed_at)
       VALUES (?, ?, 1, ?, 'Payout Test AC Motor Failure', 'AC motor burnt out and repaired', '101 Marine Drive', 'Kochi', '682001', CURDATE(), '10:00 AM - 12:00 PM', 'completed', 600.00, 600.00, NOW())`,
      [`HF-T-${String(timestamp).slice(-8)}`, customerUserId, techProfileId1]
    );
    bookingId = bookingInsert.insertId;
    assert(bookingId > 0, `Test completed booking created with ID: ${bookingId}`);

    console.log('\n--- Testing All 16 Test Cases ---');

    // TEST CASE 1: Customer initiates demo payment for completed service with technician
    console.log('\n[TC 1] Customer initiates demo payment order:');
    const orderRes = await api(`/bookings/${bookingId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      orderRes.status === 200 && orderRes.data?.success === true && orderRes.data?.order_id,
      `Customer initiated payment order: ${orderRes.data?.order_id} (Amount: ₹${(orderRes.data?.amount || 0) / 100})`
    );
    const orderId = orderRes.data?.order_id;

    // TEST CASE 2: Demo payment marked as 'paid' in payments table
    console.log('\n[TC 2] Customer verifies demo payment:');
    const verifyRes = await api(`/bookings/${bookingId}/payment/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_demo_${Date.now()}`,
        razorpay_signature: 'demo_verified_signature',
      }),
    });
    assert(
      verifyRes.status === 200 && verifyRes.data?.success === true && verifyRes.data?.payment?.payment_status === 'paid',
      'Demo payment verified and marked as PAID in payments table'
    );

    // Verify DB payment status
    const [paymentRows] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);
    assert(
      paymentRows.length === 1 && paymentRows[0].payment_status === 'paid',
      'Database verifies payment record has payment_status = paid'
    );

    // TEST CASE 3: System automatically creates technician_payouts record with pending status
    console.log('\n[TC 3] Automated technician_payouts record creation:');
    const [payoutRows] = await pool.query('SELECT * FROM technician_payouts WHERE booking_id = ?', [bookingId]);
    assert(
      payoutRows.length === 1 && payoutRows[0].payout_status === 'pending',
      `technician_payouts record automatically created with ID ${payoutRows[0]?.id} and status = pending`
    );
    payoutId = payoutRows[0]?.id;

    // TEST CASE 4: Gross amount matches customer payment amount
    console.log('\n[TC 4] Gross amount matches customer payment:');
    const grossAmount = parseFloat(payoutRows[0].gross_amount);
    assert(
      grossAmount === 600.00,
      `Gross amount is ₹${grossAmount.toFixed(2)}, matching customer payment amount ₹600.00`
    );

    // TEST CASE 5: Platform fee correctly calculated based on PLATFORM_FEE_PERCENT (10%)
    console.log('\n[TC 5] Platform fee calculation:');
    const platformFee = parseFloat(payoutRows[0].platform_fee);
    const expectedFee = Math.round(600.00 * 0.10 * 100) / 100; // 60.00
    assert(
      platformFee === expectedFee,
      `Platform fee ₹${platformFee.toFixed(2)} correctly matches 10% of gross (₹${expectedFee.toFixed(2)})`
    );

    // TEST CASE 6: Technician amount = gross_amount - platform_fee
    console.log('\n[TC 6] Technician net amount calculation:');
    const techAmount = parseFloat(payoutRows[0].technician_amount);
    const expectedTechAmount = Math.round((600.00 - expectedFee) * 100) / 100; // 540.00
    assert(
      techAmount === expectedTechAmount,
      `Technician net amount ₹${techAmount.toFixed(2)} = gross (₹${grossAmount.toFixed(2)}) - fee (₹${platformFee.toFixed(2)})`
    );

    // TEST CASE 7: Duplicate payment verification does not create duplicate earnings record
    console.log('\n[TC 7] Duplicate protection / idempotency:');
    const duplicateRes = await api(`/bookings/${bookingId}/payment/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_demo_duplicate_${Date.now()}`,
        razorpay_signature: 'demo_verified_signature',
      }),
    });
    // Duplicate call rejected
    assert(
      duplicateRes.status === 400,
      'Duplicate payment verification was rejected with status 400'
    );
    const [payoutCountAfter] = await pool.query('SELECT COUNT(*) AS count FROM technician_payouts WHERE booking_id = ?', [bookingId]);
    assert(
      payoutCountAfter[0].count === 1,
      `Exactly 1 technician payout record remains in database (No duplicate created)`
    );

    // TEST CASE 8: Unassigned or incomplete booking does not generate technician payout
    console.log('\n[TC 8] Unassigned or incomplete booking behavior:');
    const [unassignedBooking] = await pool.query(
      `INSERT INTO bookings 
        (booking_reference, user_id, service_id, technician_id, problem_title, problem_description, 
         service_address, city, pincode, scheduled_date, scheduled_time_slot, booking_status, estimated_cost)
       VALUES (?, ?, 1, NULL, 'Payout Test Unassigned Booking', 'No tech assigned yet', '101 Marine Drive', 'Kochi', '682001', CURDATE(), '02:00 PM - 04:00 PM', 'pending', 400.00)`,
      [`HF-U-${String(timestamp).slice(-8)}`, customerUserId]
    );
    const unassignedId = unassignedBooking.insertId;

    // Customer tries to pay for unassigned/incomplete booking -> must fail
    const unassignedPayRes = await api(`/bookings/${unassignedId}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      unassignedPayRes.status === 400,
      'Cannot initiate payment for incomplete/unassigned booking (HTTP 400 rejected)'
    );
    const [unassignedPayouts] = await pool.query('SELECT * FROM technician_payouts WHERE booking_id = ?', [unassignedId]);
    assert(
      unassignedPayouts.length === 0,
      'No technician payout record was generated for unassigned/incomplete booking'
    );

    // TEST CASE 9: Technician can fetch their own earnings summary and records
    console.log('\n[TC 9] Technician fetches their own earnings:');
    const techEarningsRes = await api('/technician/earnings', {
      headers: { Authorization: `Bearer ${techToken1}` },
    });
    assert(
      techEarningsRes.status === 200 && techEarningsRes.data?.success === true,
      'Technician 1 successfully fetched earnings data'
    );
    const summary = techEarningsRes.data?.data?.summary;
    const earningsList = techEarningsRes.data?.data?.earnings;
    assert(
      parseFloat(summary?.total_earnings) >= 540.00 && parseFloat(summary?.pending_payout) >= 540.00,
      `Technician summary contains total_earnings: ₹${summary?.total_earnings}, pending_payout: ₹${summary?.pending_payout}`
    );
    const thisEarning = earningsList?.find((e) => e.booking_id === bookingId);
    assert(
      thisEarning && parseFloat(thisEarning.technician_amount) === 540.00 && thisEarning.payout_status === 'pending',
      'Technician earnings list contains this booking earning with status pending and amount ₹540.00'
    );

    // Also test alias /api/bookings/technician/earnings
    const aliasRes = await api('/bookings/technician/earnings', {
      headers: { Authorization: `Bearer ${techToken1}` },
    });
    assert(
      aliasRes.status === 200 && aliasRes.data?.success === true,
      'Alias endpoint /api/bookings/technician/earnings also works cleanly'
    );

    // TEST CASE 10: Technician cannot see other technicians' earnings records
    console.log('\n[TC 10] Technician isolation (cannot see others):');
    const tech2EarningsRes = await api('/technician/earnings', {
      headers: { Authorization: `Bearer ${techToken2}` },
    });
    assert(
      tech2EarningsRes.status === 200 && tech2EarningsRes.data?.success === true,
      'Technician 2 fetched their earnings'
    );
    const tech2EarningsList = tech2EarningsRes.data?.data?.earnings;
    const hasBookingFromTech1 = tech2EarningsList?.some((e) => e.booking_id === bookingId);
    assert(
      hasBookingFromTech1 === false,
      'Technician 2 cannot see Technician 1 payout records (total isolation enforced)'
    );

    // TEST CASE 11: Customer cannot access technician earnings API (403 forbidden)
    console.log('\n[TC 11] Customer blocked from technician earnings API:');
    const custEarningsRes = await api('/technician/earnings', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      custEarningsRes.status === 403,
      `Customer access to /api/technician/earnings returns 403 Forbidden (status: ${custEarningsRes.status})`
    );

    // TEST CASE 12: Admin can fetch all technician payouts
    console.log('\n[TC 12] Admin fetches all technician payouts:');
    const adminPayoutsRes = await api('/admin/payouts', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminPayoutsRes.status === 200 && adminPayoutsRes.data?.success === true,
      'Admin successfully retrieved all technician payouts'
    );
    const adminPayoutsList = adminPayoutsRes.data?.data?.payouts;
    const adminFoundPayout = adminPayoutsList?.find((p) => p.id === payoutId);
    assert(
      adminFoundPayout && adminFoundPayout.technician_name === 'Payout Test Tech 1',
      `Admin payout list contains payout #${payoutId} for technician '${adminFoundPayout?.technician_name}'`
    );

    // TEST CASE 13: Admin can mark a payout as paid with demo payout reference and paid_at timestamp
    console.log('\n[TC 13] Admin marks payout as paid:');
    const markPaidRes = await api(`/admin/payouts/${payoutId}/mark-paid`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      markPaidRes.status === 200 && markPaidRes.data?.success === true,
      `Admin successfully marked payout #${payoutId} as PAID`
    );
    const updatedPayout = markPaidRes.data?.payout;
    assert(
      updatedPayout?.payout_status === 'paid' &&
      updatedPayout?.payout_reference &&
      updatedPayout?.payout_reference.startsWith('DEMO-PAYOUT-') &&
      updatedPayout?.paid_at !== null,
      `Payout status is 'paid', reference generated ('${updatedPayout?.payout_reference}'), paid_at timestamp set`
    );

    // TEST CASE 14: Technician sees updated status 'paid' and payout reference after admin marks paid
    console.log('\n[TC 14] Technician sees updated payout status:');
    const techAfterRes = await api('/technician/earnings', {
      headers: { Authorization: `Bearer ${techToken1}` },
    });
    const updatedEarningsList = techAfterRes.data?.data?.earnings;
    const techFoundPayout = updatedEarningsList?.find((e) => e.id === payoutId);
    assert(
      techFoundPayout &&
      techFoundPayout.payout_status === 'paid' &&
      techFoundPayout.payout_reference === updatedPayout.payout_reference &&
      techFoundPayout.paid_at !== null,
      `Technician 1 view shows status = 'paid', reference = '${techFoundPayout?.payout_reference}', and paid_at timestamp`
    );
    const summaryAfter = techAfterRes.data?.data?.summary;
    assert(
      parseFloat(summaryAfter?.paid_out) >= 540.00,
      `Technician summary reflects updated paid_out amount (₹${summaryAfter?.paid_out})`
    );

    // TEST CASE 15: Non-admin (technician/customer) cannot mark payout as paid (403 forbidden)
    console.log('\n[TC 15] Non-admin cannot mark payout as paid:');
    const techMarkRes = await api(`/admin/payouts/${payoutId}/mark-paid`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken1}` },
    });
    assert(
      techMarkRes.status === 403,
      `Technician attempting mark-paid returns 403 Forbidden (status: ${techMarkRes.status})`
    );

    const custMarkRes = await api(`/admin/payouts/${payoutId}/mark-paid`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      custMarkRes.status === 403,
      `Customer attempting mark-paid returns 403 Forbidden (status: ${custMarkRes.status})`
    );

    // TEST CASE 16: Trying to mark an already paid payout as paid returns proper message/status
    console.log('\n[TC 16] Attempting to mark already-paid payout:');
    const secondMarkRes = await api(`/admin/payouts/${payoutId}/mark-paid`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      secondMarkRes.status === 400 && secondMarkRes.data?.success === false,
      `Repeated mark-paid correctly rejected with 400: "${secondMarkRes.data?.message}"`
    );

    // Cleanup dynamic test data
    console.log('\n--- Cleaning Up Test Data ---');
    await pool.query('DELETE FROM technician_payouts WHERE booking_id IN (?, ?)', [bookingId, unassignedId]);
    await pool.query('DELETE FROM payments WHERE booking_id IN (?, ?)', [bookingId, unassignedId]);
    await pool.query('DELETE FROM bookings WHERE id IN (?, ?)', [bookingId, unassignedId]);
    await pool.query('DELETE FROM technician_profiles WHERE user_id IN (?, ?)', [techUserId1, techUserId2]);
    await pool.query('DELETE FROM users WHERE id IN (?, ?, ?)', [customerUserId, techUserId1, techUserId2]);
    console.log('✅ Test data cleaned up.');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTechnicianPayoutTests();
