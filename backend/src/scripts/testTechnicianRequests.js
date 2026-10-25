import { pool } from '../config/db.js';

const BASE_URL = 'http://localhost:5000/api';

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

async function runTechnicianWorkflowTests() {
  console.log('🧪 Starting HOMEFIX Module 3 Technician Service Requests & Recommendation Tests...\n');
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
    // 1. Customer Authentication & Create Booking
    console.log('--- 1. Customer Authentication & Service Booking ---');
    const custLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@homefix.com', password: 'User@123' }),
    });
    assert(custLogin.ok && custLogin.data.token, 'Customer logged in successfully');
    const customerToken = custLogin.data.token;

    // Get Electrical Service (id: 1)
    const servicesRes = await api('/services');
    const elecService = servicesRes.data.data.find((s) => s.id === 1) || servicesRes.data.data[0];

    const formData = new FormData();
    formData.append('service_id', elecService.id);
    formData.append('problem_title', 'Circuit breaker tripping repeatedly in living room');
    formData.append('problem_description', 'Main MCB switch trips whenever AC and TV run together.');
    formData.append('service_address', 'Flat 301, Palm Meadows, Koramangala');
    formData.append('city', 'Bangalore');
    formData.append('pincode', '560034');
    formData.append('scheduled_date', '2026-09-20');
    formData.append('scheduled_time_slot', 'Evening (04:00 PM - 07:00 PM)');
    formData.append('urgency_level', 'high');

    const bookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: formData,
    }).then((r) => r.json());

    assert(bookRes.success && bookRes.booking, 'Customer created new electrical service complaint');
    const bookingId = bookRes.booking.id;
    const bookingRef = bookRes.booking.booking_reference;

    // 2. Technician Login (Amit Verma - Electrician, Koramangala Bangalore 560034)
    console.log('\n--- 2. Technician Login & Fetch Recommended Service Requests ---');
    const techLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'tech.electric@homefix.com',
        password: 'Tech@123',
        expectedRole: 'technician',
      }),
    });
    assert(techLogin.ok && techLogin.data.token, 'Electrician logged in successfully');
    const techToken = techLogin.data.token;
    const techProfile = techLogin.data.technicianProfile;
    assert(techProfile && techProfile.service_id === elecService.id, 'Technician specialization matches service');

    // Fetch service requests
    const requestsRes = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert(requestsRes.ok && Array.isArray(requestsRes.data.data), 'Technician fetched recommended service requests');
    const matchedRequest = requestsRes.data.data.find((r) => r.id === bookingId);
    assert(matchedRequest !== undefined, 'Newly created complaint appears in technician service requests');

    // 3. Verify Recommendation Engine Match Score & Breakdown
    console.log('\n--- 3. Recommendation Engine Match Score & Details ---');
    assert(matchedRequest.booking_reference === bookingRef, 'Booking reference matches');
    assert(matchedRequest.problem_title.includes('Circuit breaker'), 'Problem title matches');
    assert(matchedRequest.service_name === elecService.name, 'Service category matches');
    assert(matchedRequest.city === 'Bangalore' && matchedRequest.pincode === '560034', 'Location details included');
    assert(matchedRequest.recommendation !== undefined, 'Recommendation object attached to request');
    assert(matchedRequest.recommendation.match_score >= 80, `High recommendation match score (${matchedRequest.recommendation.match_score}/100)`);
    assert(matchedRequest.recommendation.score_breakdown !== undefined, 'Score breakdown details included');
    assert(matchedRequest.recommendation.score_breakdown.location_score === 30, 'Location score is 30/30 (exact pincode match)');

    // Verify record in MySQL technician_recommendations
    const [recsDb] = await pool.query(
      'SELECT * FROM technician_recommendations WHERE booking_id = ? AND technician_id = ?',
      [bookingId, techProfile.id]
    );
    assert(recsDb.length > 0, 'Recommendation entry persisted in MySQL technician_recommendations table');

    // 4. Test Reject / Decline Workflow
    console.log('\n--- 4. Technician Rejection Workflow ---');
    const rejectRes = await api(`/bookings/${bookingId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({ reason: 'Schedule conflict - another job in progress' }),
    });
    assert(rejectRes.ok && rejectRes.data.success, 'Technician successfully declined service request');

    // Verify rejection log in service_status_logs
    const [rejectLogs] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? AND status = "rejected"',
      [bookingId]
    );
    assert(rejectLogs.length === 1, 'Rejection logged in service_status_logs table');
    assert(rejectLogs[0].changed_by_user_id === techLogin.data.user.id, 'Log records technician user_id');

    // Verify booking status remains 'pending' and technician_id is NULL
    const [bAfterReject] = await pool.query('SELECT booking_status, technician_id FROM bookings WHERE id = ?', [bookingId]);
    assert(bAfterReject[0].booking_status === 'pending' && bAfterReject[0].technician_id === null, 'Booking remains pending with technician_id NULL for another technician');

    // Verify this technician no longer sees this request
    const reqsAfterReject = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${techToken}` },
    });
    const stillPresent = reqsAfterReject.data.data.find((r) => r.id === bookingId);
    assert(!stillPresent, 'Declined booking is excluded from rejecting technician service requests');

    // 5. Register a second technician in the same trade/city to verify routing
    console.log('\n--- 5. Recommendation System Routes to Alternative Technician ---');
    const secondTechEmail = `tech.electric2_${Date.now()}@homefix.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rajesh Sharma (Electrician 2)',
        email: secondTechEmail,
        password: 'Password@123',
        phone: '9812345678',
        city: 'Bangalore',
        pincode: '560034',
        service_id: elecService.id,
        experience_years: 6,
        hourly_rate: 220,
        visiting_charges: 140,
        service_area: 'Koramangala / HSR',
      }),
    });
    assert(regTech2.ok && regTech2.data.token, 'Second electrician registered successfully');
    const tech2Token = regTech2.data.token;
    const tech2Profile = regTech2.data.technicianProfile;
    await pool.query("UPDATE technician_profiles SET verification_status = 'verified' WHERE id = ?", [tech2Profile.id]);

    // Second technician fetches service requests - should see the declined booking
    const reqsTech2 = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    const tech2Matched = reqsTech2.data.data.find((r) => r.id === bookingId);
    assert(tech2Matched !== undefined, 'Second technician receives the booking via recommendation engine');

    // 6. Test Accept Workflow
    console.log('\n--- 6. Technician Accept Workflow ---');
    const acceptRes = await api(`/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(acceptRes.ok && acceptRes.data.success, 'Second technician accepted the service request');

    // Verify MySQL bookings table updated
    const [bAfterAccept] = await pool.query(
      'SELECT booking_status, technician_id FROM bookings WHERE id = ?',
      [bookingId]
    );
    assert(bAfterAccept[0].booking_status === 'accepted', 'Booking status changed to "accepted" in MySQL');
    assert(bAfterAccept[0].technician_id === tech2Profile.id, 'technician_id assigned to accepting technician in MySQL');

    // Verify service_status_logs has 'accepted'
    const [acceptLogs] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? AND status = "accepted"',
      [bookingId]
    );
    assert(acceptLogs.length === 1, 'Acceptance status logged in service_status_logs');

    // Verify technician_recommendations marked was_selected = TRUE
    const [recSelected] = await pool.query(
      'SELECT was_selected FROM technician_recommendations WHERE booking_id = ? AND technician_id = ?',
      [bookingId, tech2Profile.id]
    );
    assert(recSelected.length > 0 && recSelected[0].was_selected === 1, 'technician_recommendations updated with was_selected = TRUE');

    // Verify booking now appears in Assigned Jobs
    const assignedRes = await api('/bookings/technician/assigned', {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    const foundAssigned = assignedRes.data.data.find((j) => j.id === bookingId);
    assert(foundAssigned !== undefined && foundAssigned.booking_status === 'accepted', 'Booking appears in technician assigned/active jobs');

    // Verify booking no longer appears in pending service requests
    const reqsAfterAccept = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    const inRequestsAfterAccept = reqsAfterAccept.data.data.find((r) => r.id === bookingId);
    assert(!inRequestsAfterAccept, 'Accepted booking no longer in pending requests list');

    // 7. Customer Side Verification
    console.log('\n--- 7. Customer My-Bookings Verification ---');
    const custBookingsRes = await api('/bookings/my-bookings', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const custBooking = custBookingsRes.data.data.find((b) => b.id === bookingId);
    assert(custBooking && custBooking.booking_status === 'accepted', 'Customer sees booking status "accepted"');
    assert(custBooking && custBooking.technician_name === tech2Profile.user_name || custBooking.technician_name.includes('Rajesh'), 'Customer sees assigned technician name');

    console.log(`\n====================================================`);
    console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTechnicianWorkflowTests();
