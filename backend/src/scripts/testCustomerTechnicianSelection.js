import { pool } from '../config/db.js';

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
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runCustomerTechnicianSelectionTests() {
  console.log('🧪 Starting HOMEFIX Customer → Technician Selection & Confirmation Workflow Tests...\n');
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
    // 1. Customer Authentication
    console.log('--- 1. Customer Authentication ---');
    const custLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@homefix.com', password: 'User@123' }),
    });
    assert(custLogin.ok && custLogin.data.token, 'Customer logged in successfully');
    const customerToken = custLogin.data.token;
    const customerUser = custLogin.data.user;

    // Get Carpentry Service (id: 3)
    const servicesRes = await api('/services');
    const testService = servicesRes.data.data.find((s) => s.id === 3) || servicesRes.data.data.find((s) => s.name.includes('Carpentry')) || servicesRes.data.data[0];

    // Clean up prior test carpenters and test bookings for testService to ensure clean test isolation
    await pool.query('DELETE FROM service_status_logs WHERE booking_id IN (SELECT id FROM bookings WHERE service_id = ?)', [testService.id]);
    await pool.query('DELETE FROM technician_recommendations WHERE booking_id IN (SELECT id FROM bookings WHERE service_id = ?)', [testService.id]);
    await pool.query('DELETE FROM bookings WHERE service_id = ?', [testService.id]);
    await pool.query('DELETE FROM technician_profiles WHERE service_id = ?', [testService.id]);

    // Ensure we have at least 2 distinct carpenters in the database
    console.log(`\n--- 2. Setting Up 2 Distinct Technicians for Service: ${testService.name} (id: ${testService.id}) ---`);
    const timestamp = Date.now();

    // Technician 1 (Ramesh / Tech 1)
    const tech1Email = `sel_carpenter1_${timestamp}@homefix.com`;
    const regTech1 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ramesh Woodcraft (Carpenter 1)',
        email: tech1Email,
        password: 'Password@123',
        phone: '9876543210',
        city: 'Bangalore',
        pincode: '560034',
        service_id: testService.id,
        experience_years: 5,
        hourly_rate: 250,
        visiting_charges: 150,
        service_area: 'Koramangala, Bangalore',
      }),
    });
    assert(regTech1.ok && regTech1.data.token, 'Technician 1 registered successfully');
    const tech1Token = regTech1.data.token;
    const tech1Profile = regTech1.data.technicianProfile;
    const tech1User = regTech1.data.user;

    // Set verification and rating in DB for realistic match
    await pool.query("UPDATE technician_profiles SET verification_status = 'verified', average_rating = 4.8, total_reviews = 15 WHERE id = ?", [tech1Profile.id]);

    // Technician 2 (Suresh / Tech 2)
    const tech2Email = `sel_carpenter2_${timestamp}@homefix.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Suresh Furniture (Carpenter 2)',
        email: tech2Email,
        password: 'Password@123',
        phone: '9876543211',
        city: 'Bangalore',
        pincode: '560034',
        service_id: testService.id,
        experience_years: 7,
        hourly_rate: 280,
        visiting_charges: 160,
        service_area: 'Koramangala, Bangalore',
      }),
    });
    assert(regTech2.ok && regTech2.data.token, 'Technician 2 registered successfully');
    const tech2Token = regTech2.data.token;
    const tech2Profile = regTech2.data.technicianProfile;
    const tech2User = regTech2.data.user;

    // Set verification and rating in DB for realistic match
    await pool.query("UPDATE technician_profiles SET verification_status = 'verified', average_rating = 4.9, total_reviews = 22 WHERE id = ?", [tech2Profile.id]);

    // 3. Customer Creates a Booking
    console.log('\n--- 3. Customer Creates Service Complaint Booking ---');
    const formData = new FormData();
    formData.append('service_id', testService.id);
    formData.append('problem_title', 'Wooden wardrobe door hinge broken and misaligned');
    formData.append('problem_description', 'Wardrobe door hinges came loose and wooden frame needs realignment.');
    formData.append('service_address', 'Flat 402, Green Glen Layout, Koramangala');
    formData.append('city', 'Bangalore');
    formData.append('pincode', '560034');
    formData.append('latitude', '12.9352');
    formData.append('longitude', '77.6245');
    formData.append('scheduled_date', '2026-09-25');
    formData.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formData.append('urgency_level', 'high');

    const bookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: formData,
    }).then((r) => r.json());

    assert(bookRes.success && bookRes.booking, 'Service complaint booking created successfully');
    const bookingId = bookRes.booking.id;
    const bookingRef = bookRes.booking.booking_reference;

    // Verify booking is NOT automatically assigned
    const [initialBooking] = await pool.query('SELECT booking_status, technician_id FROM bookings WHERE id = ?', [bookingId]);
    assert(initialBooking[0].booking_status === 'pending', 'Initial booking status is "pending" (not automatically assigned)');
    assert(initialBooking[0].technician_id === null, 'Initial technician_id is NULL');

    // 4. Customer Retrieves Recommendations
    console.log('\n--- 4. Customer Retrieves Top Recommended Technicians ---');
    const recsRes = await api(`/bookings/${bookingId}/recommendations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(recsRes.ok && recsRes.data.success, 'Fetched recommendations for booking');
    assert(Array.isArray(recsRes.data.data), 'Recommendations data returned as array');
    assert(recsRes.data.data.length >= 2, `At least 2 technicians recommended (got: ${recsRes.data.data.length})`);

    const recTech1 = recsRes.data.data.find((r) => r.technicianId === tech1Profile.id);
    const recTech2 = recsRes.data.data.find((r) => r.technicianId === tech2Profile.id);
    assert(recTech1 !== undefined, 'Technician 1 is in recommendations list');
    assert(recTech2 !== undefined, 'Technician 2 is in recommendations list');

    // Verify recommended card metrics
    assert(recTech1.matchScore > 0, `Technician 1 match score present: ${recTech1.matchScore}%`);
    assert(typeof recTech1.technicianName === 'string', `Technician 1 name present: ${recTech1.technicianName}`);
    assert(recTech1.breakdown && typeof recTech1.breakdown === 'object', 'Technician 1 score breakdown present');

    // 5. Validation: Cannot select non-existent / non-recommended technician
    console.log('\n--- 5. Validation Tests: Invalid Technician Selection ---');
    const invalidSelectRes = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: 99999 }),
    });
    assert(invalidSelectRes.status === 400, 'HTTP 400 when attempting to select non-recommended technician');

    // Validation: Other user cannot select technician for this booking
    const anotherCustEmail = `other_cust_${timestamp}@homefix.com`;
    const regCust2 = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Other Customer',
        email: anotherCustEmail,
        password: 'Password@123',
        phone: '9111222333',
        role: 'user',
        city: 'Bangalore',
        pincode: '560034',
      }),
    });
    const cust2Token = regCust2.data.token;
    const unauthorizedSelect = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: JSON.stringify({ technician_id: tech1Profile.id }),
    });
    assert(unauthorizedSelect.status === 403, 'HTTP 403 when another customer attempts to select technician');

    // 6. Customer Selects Technician 1
    console.log('\n--- 6. Customer Selects Technician 1 ---');
    const selectRes1 = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech1Profile.id }),
    });
    assert(selectRes1.ok && selectRes1.data.success, 'Customer selected Technician 1 successfully');

    // Verify DB state: booking_status = 'customer_selected_technician', technician_id = tech1Profile.id
    const [bAfterSelect1] = await pool.query('SELECT booking_status, technician_id FROM bookings WHERE id = ?', [bookingId]);
    assert(bAfterSelect1[0].booking_status === 'customer_selected_technician', 'Booking status updated to "customer_selected_technician"');
    assert(bAfterSelect1[0].technician_id === tech1Profile.id, 'Booking technician_id assigned to Technician 1');

    // Verify technician_recommendations was_selected = TRUE for Tech 1, FALSE for others
    const [techRecsDb] = await pool.query(
      'SELECT technician_id, was_selected FROM technician_recommendations WHERE booking_id = ?',
      [bookingId]
    );
    const tech1RecDb = techRecsDb.find((r) => r.technician_id === tech1Profile.id);
    const tech2RecDb = techRecsDb.find((r) => r.technician_id === tech2Profile.id);
    assert(Boolean(tech1RecDb?.was_selected) === true, 'technician_recommendations.was_selected is TRUE for Technician 1');
    assert(Boolean(tech2RecDb?.was_selected) === false, 'technician_recommendations.was_selected is FALSE for Technician 2');

    // Verify service_status_logs logged status customer_selected_technician
    const [logsAfterSelect1] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? ORDER BY id DESC',
      [bookingId]
    );
    assert(logsAfterSelect1[0].status === 'customer_selected_technician', 'Log created with status "customer_selected_technician"');
    assert(logsAfterSelect1[0].changed_by_user_id === customerUser.id, 'Log records customer user_id');

    // Cannot re-select technician while already in customer_selected_technician state
    const duplicateSelect = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech2Profile.id }),
    });
    assert(duplicateSelect.status === 400, 'HTTP 400 when attempting to re-select while waiting for confirmation');

    // 7. Technician 1 Receives Request
    console.log('\n--- 7. Technician 1 Receives Service Request ---');
    const reqsTech1 = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(reqsTech1.ok && reqsTech1.data.success, 'Technician 1 fetched pending service requests');
    const tech1Req = reqsTech1.data.data.find((r) => r.id === bookingId);
    assert(tech1Req !== undefined, 'Technician 1 sees the customer-selected service request');
    assert(tech1Req.booking_status === 'customer_selected_technician', 'Request has status "customer_selected_technician"');

    // Technician 2 should NOT see this request since it was directed specifically to Technician 1
    const reqsTech2Check = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    const tech2SawDirectedReq = reqsTech2Check.data.data.find((r) => r.id === bookingId);
    assert(!tech2SawDirectedReq, 'Technician 2 does not see request directed specifically to Technician 1');

    // 8. Technician 1 Declines / Rejects with Reason
    console.log('\n--- 8. Technician 1 Declines / Rejects Request ---');
    const rejectionReasonText = 'Schedule conflict / Prior emergency commitment';
    const rejectRes = await api(`/bookings/${bookingId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ reason: rejectionReasonText }),
    });
    assert(rejectRes.ok && rejectRes.data.success, 'Technician 1 rejected request with reason');

    // Verify DB state: booking_status = 'technician_rejected', technician_id = NULL, rejection_reason set
    const [bAfterReject] = await pool.query(
      'SELECT booking_status, technician_id, rejection_reason FROM bookings WHERE id = ?',
      [bookingId]
    );
    assert(bAfterReject[0].booking_status === 'technician_rejected', 'Booking status updated to "technician_rejected"');
    assert(bAfterReject[0].technician_id === null, 'technician_id reset to NULL');
    assert(bAfterReject[0].rejection_reason === rejectionReasonText, 'Rejection reason saved in bookings table');

    // Verify service_status_logs logged status technician_rejected
    const [logsAfterReject] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? ORDER BY id DESC',
      [bookingId]
    );
    assert(logsAfterReject[0].status === 'technician_rejected', 'Log recorded with status "technician_rejected"');
    assert(logsAfterReject[0].changed_by_user_id === tech1User.id, 'Log records technician user_id');
    assert(logsAfterReject[0].remarks.includes(rejectionReasonText), 'Log remarks include rejection reason text');

    // 9. Customer Inspects Booking Details After Rejection
    console.log('\n--- 9. Customer Inspects Booking Details After Rejection ---');
    const custBookingRes = await api(`/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custBookingRes.ok && custBookingRes.data.success, 'Customer fetched booking details');
    const custBookingData = custBookingRes.data.booking;
    assert(custBookingData.booking_status === 'technician_rejected', 'Customer sees booking status "technician_rejected"');
    assert(custBookingData.rejection_reason === rejectionReasonText, 'Customer sees rejection reason');

    // Verify getBookingRecommendations marks Tech 1 as isRejected = true
    const recsAfterReject = await api(`/bookings/${bookingId}/recommendations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const tech1AfterReject = recsAfterReject.data.data.find((r) => r.technicianId === tech1Profile.id);
    assert(tech1AfterReject && tech1AfterReject.isRejected === true, 'Technician 1 is marked isRejected = true in recommendations');

    // 10. Validation: Customer Cannot Re-Select Rejected Technician
    console.log('\n--- 10. Validation: Customer Cannot Re-Select Rejected Technician ---');
    const reselectRejectRes = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech1Profile.id }),
    });
    assert(reselectRejectRes.status === 400, 'HTTP 400 when customer attempts to re-select rejected technician');
    assert(
      reselectRejectRes.data.message.includes('declined') || reselectRejectRes.data.message.includes('rejected'),
      `Descriptive error message returned: "${reselectRejectRes.data.message}"`
    );

    // 11. Customer Selects Technician 2 (Alternative Recommendation)
    console.log('\n--- 11. Customer Selects Technician 2 (Alternative) ---');
    const selectRes2 = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech2Profile.id }),
    });
    assert(selectRes2.ok && selectRes2.data.success, 'Customer successfully selected Technician 2');

    // Verify DB state: booking_status = 'customer_selected_technician', technician_id = tech2Profile.id
    const [bAfterSelect2] = await pool.query(
      'SELECT booking_status, technician_id, rejection_reason FROM bookings WHERE id = ?',
      [bookingId]
    );
    assert(bAfterSelect2[0].booking_status === 'customer_selected_technician', 'Booking status changed back to "customer_selected_technician"');
    assert(bAfterSelect2[0].technician_id === tech2Profile.id, 'Booking technician_id assigned to Technician 2');
    assert(bAfterSelect2[0].rejection_reason === null, 'Rejection reason cleared upon new technician selection');

    // 12. Technician 2 Receives Request and Accepts
    console.log('\n--- 12. Technician 2 Receives Request and Accepts ---');
    const reqsTech2 = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    const tech2Req = reqsTech2.data.data.find((r) => r.id === bookingId);
    assert(tech2Req !== undefined, 'Technician 2 receives the service request');

    const acceptRes = await api(`/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(acceptRes.ok && acceptRes.data.success, 'Technician 2 accepted the booking');

    // Verify DB state: booking_status = 'accepted', technician_id = tech2Profile.id
    const [bAfterAccept] = await pool.query(
      'SELECT booking_status, technician_id FROM bookings WHERE id = ?',
      [bookingId]
    );
    assert(bAfterAccept[0].booking_status === 'accepted', 'Booking status changed to "accepted" in MySQL');
    assert(bAfterAccept[0].technician_id === tech2Profile.id, 'technician_id remains Technician 2 in MySQL');

    // Verify service_status_logs has 'accepted'
    const [logsAfterAccept] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? ORDER BY id DESC',
      [bookingId]
    );
    assert(logsAfterAccept[0].status === 'accepted', 'Log recorded with status "accepted"');
    assert(logsAfterAccept[0].changed_by_user_id === tech2User.id, 'Log records technician 2 user_id');

    // 13. Customer Checks Booking Details After Acceptance
    console.log('\n--- 13. Customer Sees Confirmed Technician ---');
    const custFinalDetails = await api(`/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const finalBooking = custFinalDetails.data.booking;
    assert(finalBooking.booking_status === 'accepted', 'Customer sees status "accepted"');
    assert(finalBooking.technician_name === 'Suresh Furniture (Carpenter 2)', `Customer sees technician name "${finalBooking.technician_name}"`);

    // 14. Validation: Cannot Select Technician for Already Accepted Booking
    console.log('\n--- 14. Validation: Cannot Modify Accepted Booking ---');
    const selectOnAccepted = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech1Profile.id }),
    });
    assert(selectOnAccepted.status === 400, 'HTTP 400 when attempting to select technician on accepted booking');

    // Technician cannot accept an already accepted booking
    const duplicateAccept = await api(`/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(duplicateAccept.status === 400, 'HTTP 400 when attempting to re-accept an already accepted booking');

    // 15. Audit Trail Verification
    console.log('\n--- 15. Full Lifecycle Audit Trail Verification ---');
    const [fullAuditTrail] = await pool.query(
      'SELECT status, remarks FROM service_status_logs WHERE booking_id = ? ORDER BY id ASC',
      [bookingId]
    );
    const statusSequence = fullAuditTrail.map((l) => l.status);
    console.log(`  Audit trail status sequence: [${statusSequence.join(' -> ')}]`);
    assert(
      statusSequence[0] === 'pending' &&
      statusSequence.includes('customer_selected_technician') &&
      statusSequence.includes('technician_rejected') &&
      statusSequence.includes('accepted'),
      'Complete status lifecycle (pending -> customer_selected_technician -> technician_rejected -> customer_selected_technician -> accepted) audited'
    );
  } catch (error) {
    console.error('❌ Test execution error:', error);
    failed++;
  } finally {
    console.log(`\n==================================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`==================================================\n`);
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runCustomerTechnicianSelectionTests();
