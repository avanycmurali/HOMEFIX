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

async function runAdminAndHistoryTests() {
  console.log('🧪 Starting HOMEFIX Module 5: Admin & Service History Automated Tests...\n');
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

  try {
    // 0. Initial Cleanup of dynamic test artifacts
    await pool.query("DELETE FROM admin_logs WHERE admin_user_id IN (SELECT id FROM users WHERE email LIKE 'test_mod5_%') OR target_id IN (SELECT id FROM users WHERE email LIKE 'test_mod5_%')");
    await pool.query("DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Module 5 Test%')");
    await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Module 5 Test%')");
    await pool.query("DELETE FROM service_status_logs WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Module 5 Test%')");
    await pool.query("DELETE FROM technician_recommendations WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Module 5 Test%')");
    await pool.query("DELETE FROM tool_material_suggestions WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE 'Module 5 Test%')");
    await pool.query("DELETE FROM bookings WHERE problem_title LIKE 'Module 5 Test%'");
    await pool.query("DELETE FROM technician_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_mod5_%')");
    await pool.query("DELETE FROM users WHERE email LIKE 'test_mod5_%'");

    // 1. Setup Actors: Admin, Customer 1, Customer 2, Technician 1, Technician 2
    console.log('--- Setting Up Actors ---');

    // Admin Login (using seed admin)
    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@homefix.com', password: 'Admin@123' }),
    });
    assert(adminLogin.ok && adminLogin.data.token, 'Admin account authenticated successfully');
    const adminToken = adminLogin.data.token;

    // Customer 1 (Owner)
    const cust1Email = `test_mod5_cust1_${timestamp}@homefix.com`;
    const regCust1 = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mod5 Alice Customer',
        email: cust1Email,
        password: 'Password@123',
        phone: '9888822221',
        role: 'user',
        city: 'Bangalore',
        pincode: '560034',
        address: '101 Alice Way, Koramangala',
      }),
    });
    assert(regCust1.ok && regCust1.data.token, 'Customer 1 registered successfully');
    const cust1Token = regCust1.data.token;
    const cust1Id = regCust1.data.user.id;

    // Customer 2 (Other customer for unauthorized access checks)
    const cust2Email = `test_mod5_cust2_${timestamp}@homefix.com`;
    const regCust2 = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mod5 Bob Customer',
        email: cust2Email,
        password: 'Password@123',
        phone: '9888822222',
        role: 'user',
        city: 'Bangalore',
        pincode: '560034',
        address: '102 Bob St, Indiranagar',
      }),
    });
    assert(regCust2.ok && regCust2.data.token, 'Customer 2 registered successfully');
    const cust2Token = regCust2.data.token;

    // Technician 1 (Starts pending verification, then admin verifies)
    const tech1Email = `test_mod5_tech1_${timestamp}@homefix.com`;
    const regTech1 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mod5 Master Electrician',
        email: tech1Email,
        password: 'Password@123',
        phone: '9888822223',
        service_id: 1, // Electrical
        experience_years: 6,
        hourly_rate: 400,
        visiting_charges: 150,
        city: 'Bangalore',
        pincode: '560034',
        service_area: 'Koramangala, Indiranagar',
      }),
    });
    assert(regTech1.ok && regTech1.data.token, 'Technician 1 registered successfully (pending)');
    const tech1Token = regTech1.data.token;
    const tech1ProfileId = regTech1.data.technicianProfile?.id;
    const tech1UserId = regTech1.data.user.id;

    // Technician 2 (Starts pending verification, then admin rejects)
    const tech2Email = `test_mod5_tech2_${timestamp}@homefix.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mod5 Unverified Applicant',
        email: tech2Email,
        password: 'Password@123',
        phone: '9888822224',
        service_id: 1,
        experience_years: 1,
        hourly_rate: 300,
        visiting_charges: 150,
        city: 'Bangalore',
        pincode: '560034',
        service_area: 'Bangalore East',
      }),
    });
    assert(regTech2.ok && regTech2.data.token, 'Technician 2 registered successfully (pending)');
    const tech2UserId = regTech2.data.user.id;

    // 2. Admin Verification Actions
    console.log('\n--- Admin Verification of Technicians ---');

    // Admin approves Technician 1
    const approveTech1 = await api(`/admin/technicians/${tech1UserId}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ verification_status: 'verified', remarks: 'Credentials inspected and verified' }),
    });
    assert(approveTech1.ok && approveTech1.data.success, '10. Admin can approve pending technician (status: verified)');

    // Admin rejects Technician 2
    const rejectTech2 = await api(`/admin/technicians/${tech2UserId}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ verification_status: 'rejected', remarks: 'Incomplete experience certificates' }),
    });
    assert(rejectTech2.ok && rejectTech2.data.success, '11. Admin can reject technician with recorded reason (status: rejected)');

    // 3. Service Lifecycle & Bookings Setup
    console.log('\n--- Setting Up Lifecycle Bookings & Payments ---');

    // Create Booking 1: Verified Technician 1 will be in recommendations!
    const createBooking1 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({
        service_id: 1,
        problem_title: 'Module 5 Test - Short circuit in switchboard',
        problem_description: 'Sparking noticed when turning on living room switchboard',
        service_address: '101 Alice Way, Koramangala',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-10-01',
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'high',
      }),
    });
    assert(createBooking1.ok && createBooking1.data.booking?.id, 'Booking 1 created by Customer 1');
    const booking1Id = createBooking1.data.booking.id;

    // Customer selects Technician 1
    const selectRes = await api(`/bookings/${booking1Id}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({ technician_id: tech1ProfileId }),
    });
    assert(selectRes.ok, 'Technician 1 selected for Booking 1');

    // Technician 1 accepts Booking 1
    const acceptRes = await api(`/bookings/${booking1Id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(acceptRes.ok, 'Technician 1 accepted Booking 1');

    // Technician 1 starts service
    const startRes = await api(`/bookings/${booking1Id}/start-service`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(startRes.ok, 'Service started on Booking 1 (status: in_progress)');

    // Technician 1 completes service
    const completeRes = await api(`/bookings/${booking1Id}/complete-service`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ service_notes: 'Replaced charred 16A MCB and re-wired master terminal' }),
    });
    assert(completeRes.ok, 'Service completed on Booking 1 (status: completed)');

    // Customer 1 pays for Booking 1 via Demo Payment
    const initPayRes = await api(`/bookings/${booking1Id}/payment/order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    assert(initPayRes.ok && initPayRes.data.order_id, 'Demo payment initiated for Booking 1');
    const createdOrderId = initPayRes.data.order_id;
    const demoPayId = `pay_demo_${timestamp}`;

    const verifyPayRes = await api(`/bookings/${booking1Id}/payment/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: demoPayId,
        razorpay_signature: 'demo_verified_signature',
      }),
    });
    assert(verifyPayRes.ok && verifyPayRes.data.success, 'Demo payment verified and paid for Booking 1');

    // Create Booking 2: Remains in pending status (for review boundary test)
    const createBooking2 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({
        service_id: 1,
        problem_title: 'Module 5 Test - Pending Fan Repair',
        problem_description: 'Ceiling fan regulator noisy',
        service_address: '101 Alice Way, Koramangala',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-10-02',
        scheduled_time_slot: '02:00 PM - 04:00 PM',
        urgency_level: 'low',
      }),
    });
    assert(createBooking2.ok, 'Booking 2 created (status: pending)');
    const booking2Id = createBooking2.data.booking.id;

    // =========================================================================
    // EXECUTE ALL MODULE 5 VERIFICATIONS
    // =========================================================================
    console.log('\n--- Executing 23 Module 5 Verifications ---');

    // 1. Admin authentication & role protection
    const adminCheck = await api('/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCheck.status === 200 && adminCheck.data.success === true, '1. Admin authentication & role protection grants access (200)');

    // 2. Customer cannot access /api/admin/*
    const custAccessCheck = await api('/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    assert(custAccessCheck.status === 403, '2. Customer cannot access /api/admin/* (403 Forbidden)');

    // 3. Technician cannot access /api/admin/*
    const techAccessCheck = await api('/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(techAccessCheck.status === 403, '3. Technician cannot access /api/admin/* (403 Forbidden)');

    // 4. Unauthenticated request rejected
    const noAuthCheck = await api('/admin/dashboard-stats');
    assert(noAuthCheck.status === 401, '4. Unauthenticated request without token rejected (401 Unauthorized)');

    // 5. Admin can retrieve dashboard stats
    assert(
      adminCheck.data.data?.customers?.total >= 2 &&
      adminCheck.data.data?.technicians?.total >= 2 &&
      adminCheck.data.data?.bookings?.total >= 2 &&
      adminCheck.data.data?.payments?.total_transactions >= 1 &&
      Number(adminCheck.data.data?.payments?.total_revenue) > 0,
      '5. Admin can retrieve dashboard stats with aggregated real MySQL counts and revenue'
    );

    // 6. Admin can retrieve customer list
    const custList = await api('/admin/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundCust1 = custList.data.data?.find((c) => c.id === cust1Id);
    assert(
      custList.ok && Array.isArray(custList.data.data) && foundCust1 && foundCust1.total_bookings >= 2,
      '6. Admin can retrieve customer list with accurate booking counts'
    );

    // 7. Admin can view customer profile and service history
    const custDetail = await api(`/admin/customers/${cust1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      custDetail.ok &&
      custDetail.data.data?.customer?.id === cust1Id &&
      Array.isArray(custDetail.data.data?.bookings) &&
      custDetail.data.data.bookings.length >= 2 &&
      Array.isArray(custDetail.data.data?.payments) &&
      custDetail.data.data.payments.length >= 1,
      '7. Admin can view customer profile, service history, and payments breakdown'
    );

    // 8. Admin can toggle customer active/inactive status
    const toggleInactive = await api(`/admin/customers/${cust1Id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'inactive', remarks: 'Customer paused temporarily for verification' }),
    });
    assert(toggleInactive.ok && toggleInactive.data.success, '8. Admin can toggle customer status to inactive');

    // Toggle back to active
    await api(`/admin/customers/${cust1Id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'active', remarks: 'Customer re-activated' }),
    });

    // 9. Admin can retrieve technician list
    const techList = await api('/admin/technicians', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundTech = techList.data.data?.find((t) => t.id === tech1UserId || t.user_id === tech1UserId);
    assert(
      techList.ok && Array.isArray(techList.data.data) && foundTech && Number(foundTech.visiting_charges) === 150,
      '9. Admin can retrieve technician list with specialization and rates'
    );

    // 12. Admin can view bookings with status filtering
    const completedBookings = await api('/admin/bookings?status=completed', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      completedBookings.ok &&
      completedBookings.data.data?.every((b) => b.booking_status === 'completed'),
      '12. Admin can view bookings with multi-filter by status=completed'
    );

    // 13. Admin can view payments ledger
    const paymentsLedger = await api('/admin/payments', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundPayment = paymentsLedger.data.data?.find((p) => p.booking_id === booking1Id);
    assert(
      paymentsLedger.ok && foundPayment && foundPayment.payment_status === 'paid',
      '13. Admin can view payments ledger with customer, technician, amount, and status'
    );

    // 14. Demo payments are clearly flagged
    assert(
      foundPayment && foundPayment.is_demo === true,
      '14. Demo payments are clearly flagged (is_demo: true)'
    );

    // 15. Password hashes and reset tokens are never exposed in any admin endpoint
    const checkCustPw = custList.data.data?.some((c) => c.password || c.reset_password_token);
    const checkTechPw = techList.data.data?.some((t) => t.password || t.reset_password_token);
    const checkCustDetailPw = custDetail.data.data?.customer?.password || custDetail.data.data?.customer?.reset_password_token;
    assert(
      !checkCustPw && !checkTechPw && !checkCustDetailPw,
      '15. Password hashes and reset tokens are NEVER exposed in any admin endpoint responses'
    );

    // 16. Customer can submit review for completed booking
    const submitReview = await api(`/bookings/${booking1Id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({
        rating: 5,
        comment: 'Outstanding repair service! Very punctual and clean workmanship.',
      }),
    });
    assert(
      submitReview.status === 201 && submitReview.data.success === true,
      '16. Customer can submit 1–5 star rating and comment for completed booking'
    );

    // 17. Customer cannot submit review for pending/in-progress booking
    const reviewPending = await api(`/bookings/${booking2Id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({ rating: 4, comment: 'Premature review attempt' }),
    });
    assert(
      reviewPending.status === 400,
      '17. Customer cannot submit review for pending/in-progress booking (400 Bad Request)'
    );

    // 18. Customer cannot submit duplicate review
    const duplicateReview = await api(`/bookings/${booking1Id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1Token}` },
      body: JSON.stringify({ rating: 3, comment: 'Second review attempt' }),
    });
    assert(
      duplicateReview.status === 400,
      '18. Customer cannot submit duplicate review for the same booking (400 Bad Request)'
    );

    // 19. Customer can view own completed service history
    const myBookingsRes = await api('/bookings/my-bookings', {
      headers: { Authorization: `Bearer ${cust1Token}` },
    });
    const myCompleted = myBookingsRes.data.data?.find((b) => b.id === booking1Id);
    assert(
      myBookingsRes.ok && myCompleted && myCompleted.customer_rating === 5 && myCompleted.customer_review,
      '19. Customer can view own completed service history with embedded review rating and comment'
    );

    // 20. Customer cannot view another customer\'s private history
    const unauthorizedBookingView = await api(`/bookings/${booking1Id}`, {
      headers: { Authorization: `Bearer ${cust2Token}` },
    });
    assert(
      unauthorizedBookingView.status === 403,
      "20. Customer cannot view another customer's private booking details or service record (403 Forbidden)"
    );

    // 21. Technician can view own completed service history
    const techJobsRes = await api('/bookings/technician', {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    const techCompletedJob = techJobsRes.data.data?.find((j) => j.id === booking1Id);
    assert(
      techJobsRes.ok && techCompletedJob && techCompletedJob.booking_status === 'completed',
      '21. Technician can view own completed service history'
    );

    // 22. Admin can view reviews list
    const adminReviews = await api('/admin/reviews', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foundReview = adminReviews.data.data?.find((r) => r.booking_id === booking1Id);
    assert(
      adminReviews.ok && foundReview && foundReview.rating === 5 && foundReview.customer_name === 'Mod5 Alice Customer',
      '22. Admin can view all customer reviews with technician and service metadata'
    );

    // 23. Admin actions are persisted in admin_logs
    const auditLogsRes = await api('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyLog = auditLogsRes.data.data?.find((l) => (l.action_type || l.action) === 'technician_verified' || (l.action_type || l.action) === 'technician_rejected');
    const statusLog = auditLogsRes.data.data?.find((l) => (l.action_type || l.action) === 'customer_status_updated');
    assert(
      auditLogsRes.ok && verifyLog && statusLog,
      '23. Administrative actions are logged and persisted in MySQL admin_logs table'
    );

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log(`\n==============================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`==============================================\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runAdminAndHistoryTests();
