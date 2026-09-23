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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTechnicianServiceLifecycleTests() {
  console.log('🧪 Starting HOMEFIX Module 4 Step 1: Technician Service Lifecycle Tests...\n');
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

    // Retrieve active service (e.g. Electrical Services id: 1)
    const servicesRes = await api('/services');
    const testService =
      servicesRes.data.data.find((s) => s.id === 1) ||
      servicesRes.data.data.find((s) => s.name.includes('Electrical')) ||
      servicesRes.data.data[0];

    // Clean up previous lifecycle test data for clean isolation without touching seeded demo accounts
    await pool.query(
      "DELETE FROM service_status_logs WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE '%living room switch%' OR problem_title LIKE '%Fan regulator%')"
    );
    await pool.query(
      "DELETE FROM technician_recommendations WHERE booking_id IN (SELECT id FROM bookings WHERE problem_title LIKE '%living room switch%' OR problem_title LIKE '%Fan regulator%')"
    );
    await pool.query(
      "DELETE FROM bookings WHERE problem_title LIKE '%living room switch%' OR problem_title LIKE '%Fan regulator%'"
    );
    await pool.query(
      "DELETE FROM technician_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'lifecycle_%')"
    );
    await pool.query(
      "DELETE FROM users WHERE email LIKE 'lifecycle_%'"
    );

    // 2. Setup 2 Distinct Technicians
    console.log(`\n--- 2. Setting Up 2 Distinct Technicians for Service: ${testService.name} (id: ${testService.id}) ---`);
    const timestamp = Date.now();

    // Technician 1 (Assigned tech)
    const tech1Email = `lifecycle_tech1_${timestamp}@homefix.com`;
    const regTech1 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Arun Electrician (Primary Tech)',
        email: tech1Email,
        password: 'Password@123',
        phone: '9876543211',
        city: 'Bangalore',
        pincode: '560034',
        service_id: testService.id,
        experience_years: 6,
        hourly_rate: 300,
        visiting_charges: 150,
        service_area: 'Koramangala, Bangalore',
      }),
    });
    assert(regTech1.ok && regTech1.data.token, 'Technician 1 registered successfully');
    const tech1Token = regTech1.data.token;
    const tech1Profile = regTech1.data.technicianProfile;
    const tech1User = regTech1.data.user;

    // Technician 2 (Secondary tech for unauthorized tests)
    const tech2Email = `lifecycle_tech2_${timestamp}@homefix.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Karthik Sparks (Secondary Tech)',
        email: tech2Email,
        password: 'Password@123',
        phone: '9876543212',
        city: 'Bangalore',
        pincode: '560034',
        service_id: testService.id,
        experience_years: 4,
        hourly_rate: 250,
        visiting_charges: 120,
        service_area: 'Indiranagar, Bangalore',
      }),
    });
    assert(regTech2.ok && regTech2.data.token, 'Technician 2 registered successfully');
    const tech2Token = regTech2.data.token;
    const tech2Profile = regTech2.data.technicianProfile;

    // 3. Customer Creates Booking & Selects Technician 1
    console.log('\n--- 3. Customer Creates Booking & Selects Technician 1 ---');
    const createRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        service_id: testService.id,
        problem_title: 'Main breaker trip & spark in living room switch',
        problem_description: 'The main MCB keeps tripping whenever the air conditioner is turned on.',
        service_address: '42, 5th Cross, Koramangala 4th Block',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-09-25',
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'high',
      }),
    });
    assert(createRes.ok && createRes.data.booking, 'Service complaint created successfully');
    const bookingId = createRes.data.booking.id;

    // Customer selects Technician 1
    const selectRes = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech1Profile.id }),
    });
    assert(selectRes.ok, 'Customer selected Technician 1 successfully');

    // 4. Invalid Status Transition Tests: Cannot Start/Complete Before Acceptance
    console.log('\n--- 4. Invalid Status Transitions Before Acceptance ---');
    const startBeforeAccept = await api(`/bookings/${bookingId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(
      startBeforeAccept.status === 400,
      `HTTP 400 when attempting to start unaccepted booking (got: ${startBeforeAccept.status})`
    );

    const completeBeforeAccept = await api(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ service_notes: 'Completed prematurely' }),
    });
    assert(
      completeBeforeAccept.status === 400,
      `HTTP 400 when attempting to complete unaccepted booking (got: ${completeBeforeAccept.status})`
    );

    // 5. Technician 1 Accepts Booking
    console.log('\n--- 5. Technician 1 Accepts Booking ---');
    const acceptRes = await api(`/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(acceptRes.ok, 'Technician 1 accepted booking successfully');

    const [acceptedRows] = await pool.query('SELECT booking_status FROM bookings WHERE id = ?', [bookingId]);
    assert(acceptedRows[0]?.booking_status === 'accepted', 'Booking status is "accepted" in MySQL');

    // 6. Authorization Tests on Accepted Booking
    console.log('\n--- 6. Technician Authorization Tests ---');
    const unauthStart = await api(`/bookings/${bookingId}/start`, {
      method: 'PUT',
    });
    assert(unauthStart.status === 401, `HTTP 401 for unauthenticated start attempt (got: ${unauthStart.status})`);

    const custStart = await api(`/bookings/${bookingId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      custStart.status === 403,
      `HTTP 403 when customer attempts to start service (got: ${custStart.status})`
    );

    const tech2Start = await api(`/bookings/${bookingId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(
      tech2Start.status === 403,
      `HTTP 403 when unassigned Technician 2 attempts to start service (got: ${tech2Start.status})`
    );

    const custComplete = await api(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      custComplete.status === 403,
      `HTTP 403 when customer attempts to complete service (got: ${custComplete.status})`
    );

    const tech2Complete = await api(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(
      tech2Complete.status === 403,
      `HTTP 403 when unassigned Technician 2 attempts to complete service (got: ${tech2Complete.status})`
    );

    // 7. Invalid Transition: Cannot Complete Directly from Accepted (Must Start First)
    console.log('\n--- 7. Invalid Transition: Complete Before Start ---');
    const completeFromAccepted = await api(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ service_notes: 'Trying to finish before starting' }),
    });
    assert(
      completeFromAccepted.status === 400,
      `HTTP 400 when attempting to mark completed without starting (got: ${completeFromAccepted.status})`
    );
    assert(
      completeFromAccepted.data?.message?.includes('start') || completeFromAccepted.data?.message?.includes('in_progress'),
      'Descriptive error message explains service must be started first'
    );

    // 8. Start Service (Happy Path)
    console.log('\n--- 8. Start Service (ACCEPTED -> IN_PROGRESS) ---');
    const startRes = await api(`/bookings/${bookingId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ remarks: 'Technician arrived at site and commenced inspection.' }),
    });
    assert(startRes.ok, `HTTP 200 OK when assigned technician starts service (got: ${startRes.status})`);
    assert(startRes.data.booking?.booking_status === 'in_progress', 'Response confirms booking_status is "in_progress"');

    // Database verification
    const [inProgressRows] = await pool.query('SELECT booking_status FROM bookings WHERE id = ?', [bookingId]);
    assert(inProgressRows[0]?.booking_status === 'in_progress', 'Database reflects status "in_progress"');

    // Verify service_status_logs
    const [startLogRows] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? AND status = ?',
      [bookingId, 'in_progress']
    );
    assert(startLogRows.length === 1, 'service_status_logs contains record for "in_progress"');
    assert(
      startLogRows[0]?.changed_by_user_id === tech1User.id,
      'service_status_logs records changed_by_user_id matching Technician 1'
    );

    // Also verify alias endpoint: PUT /api/bookings/:id/start-service
    // First, verify attempting to re-start returns 400
    const reStartRes = await api(`/bookings/${bookingId}/start-service`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(
      reStartRes.status === 400,
      `HTTP 400 when attempting to start an already in-progress booking (got: ${reStartRes.status})`
    );

    // 9. Validation on In-Progress Booking
    console.log('\n--- 9. Validations on In-Progress Booking ---');
    const reAccept = await api(`/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(reAccept.status === 400, `HTTP 400 when attempting to accept an in-progress booking (got: ${reAccept.status})`);

    const reSelect = await api(`/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech2Profile.id }),
    });
    assert(reSelect.status === 400, `HTTP 400 when attempting to select another technician while in-progress (got: ${reSelect.status})`);

    // 10. Mark Completed (Happy Path)
    console.log('\n--- 10. Mark Completed (IN_PROGRESS -> COMPLETED) ---');
    const initialCompletedJobs = tech1Profile.total_jobs_completed || 0;
    const testNotes = 'Diagnosed faulty 32A MCB breaker. Replaced with new modular breaker and tested under AC load. All circuits safe.';

    const completeRes = await api(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({
        service_notes: testNotes,
        final_cost: 350.0,
      }),
    });
    assert(completeRes.ok, `HTTP 200 OK when technician marks service completed (got: ${completeRes.status})`);
    assert(completeRes.data.booking?.booking_status === 'completed', 'Response confirms booking_status is "completed"');
    assert(completeRes.data.service_notes === testNotes, 'Response contains recorded service notes');
    assert(completeRes.data.completed_at != null, 'Response contains valid completed_at timestamp');

    // Database verification: bookings table
    const [completedRows] = await pool.query(
      'SELECT booking_status, service_notes, completed_at, final_cost FROM bookings WHERE id = ?',
      [bookingId]
    );
    assert(completedRows[0]?.booking_status === 'completed', 'Database bookings table reflects status "completed"');
    assert(completedRows[0]?.service_notes === testNotes, 'Database service_notes column populated correctly');
    assert(completedRows[0]?.completed_at != null, 'Database completed_at timestamp column populated');
    assert(parseFloat(completedRows[0]?.final_cost) === 350.0, 'Database final_cost recorded');

    // Database verification: service_status_logs table
    const [completeLogRows] = await pool.query(
      'SELECT * FROM service_status_logs WHERE booking_id = ? AND status = ?',
      [bookingId, 'completed']
    );
    assert(completeLogRows.length === 1, 'service_status_logs contains record for "completed"');
    assert(
      completeLogRows[0]?.changed_by_user_id === tech1User.id,
      'service_status_logs records changed_by_user_id matching Technician 1'
    );
    assert(
      completeLogRows[0]?.remarks?.includes(testNotes),
      'service_status_logs remarks include the technician service notes'
    );

    // Database verification: technician_profiles total_jobs_completed
    const [updatedTechRows] = await pool.query(
      'SELECT total_jobs_completed FROM technician_profiles WHERE id = ?',
      [tech1Profile.id]
    );
    assert(
      updatedTechRows[0]?.total_jobs_completed === initialCompletedJobs + 1,
      `technician_profiles.total_jobs_completed incremented by 1 (was: ${initialCompletedJobs}, now: ${updatedTechRows[0]?.total_jobs_completed})`
    );

    // 11. Invalid Transitions on Completed Booking
    console.log('\n--- 11. Invalid Transitions on Completed Booking ---');
    const startCompleted = await api(`/bookings/${bookingId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(
      startCompleted.status === 400,
      `HTTP 400 when attempting to start an already completed booking (got: ${startCompleted.status})`
    );

    const reComplete = await api(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ service_notes: 'Duplicate completion' }),
    });
    assert(
      reComplete.status === 400,
      `HTTP 400 when attempting to re-complete an already completed booking (got: ${reComplete.status})`
    );

    const cancelCompleted = await api(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ reason: 'Cannot cancel finished work' }),
    });
    assert(
      cancelCompleted.status === 400,
      `HTTP 400 when attempting to cancel a completed booking (got: ${cancelCompleted.status})`
    );

    // 12. Verification of Customer Dashboard View
    console.log('\n--- 12. Customer Dashboard Visibility ---');
    const myBookingsRes = await api('/bookings/my-bookings', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(myBookingsRes.ok, 'Customer successfully retrieved personal bookings');
    const customerBooking = myBookingsRes.data.data.find((b) => b.id === bookingId);
    assert(Boolean(customerBooking), 'Completed booking present in customer bookings list');
    assert(customerBooking?.booking_status === 'completed', 'Customer sees booking_status as "completed"');
    assert(
      customerBooking?.technician_name === 'Arun Electrician (Primary Tech)',
      `Customer sees assigned technician name: ${customerBooking?.technician_name}`
    );
    assert(customerBooking?.service_notes === testNotes, 'Customer sees technician service notes');
    assert(customerBooking?.completed_at != null, 'Customer sees service completion timestamp');

    // 13. Verification of Technician Dashboard View
    console.log('\n--- 13. Technician Dashboard Visibility ---');
    const assignedJobsRes = await api('/bookings/technician/assigned', {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(assignedJobsRes.ok, 'Technician successfully retrieved assigned jobs');
    const techJob = assignedJobsRes.data.data.find((j) => j.id === bookingId);
    assert(Boolean(techJob), 'Completed job present in technician assigned jobs list');
    assert(techJob?.booking_status === 'completed', 'Technician sees job status as "completed"');
    assert(techJob?.service_notes === testNotes, 'Technician sees stored service notes');
    assert(techJob?.completed_at != null, 'Technician sees completion timestamp');

    // 14. Full Lifecycle Audit Trail in service_status_logs
    console.log('\n--- 14. Full Lifecycle Audit Trail Verification ---');
    const detailsRes = await api(`/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(detailsRes.ok, 'Booking details fetched with audit status history');
    const statusLogs = detailsRes.data.statusHistory || [];
    const statusSequence = statusLogs.map((l) => l.status);
    console.log(`  Audit trail status sequence: [${statusSequence.join(' -> ')}]`);

    const expectedSequence = ['pending', 'customer_selected_technician', 'accepted', 'in_progress', 'completed'];
    const hasFullSequence = expectedSequence.every((expectedStatus, idx) => statusSequence[idx] === expectedStatus);
    assert(
      hasFullSequence,
      'Audit log contains exact sequence: pending -> customer_selected_technician -> accepted -> in_progress -> completed'
    );

    // Also verify alias endpoints: /mark-completed and /complete-service routing
    console.log('\n--- 15. Testing Route Aliases (/mark-completed, /complete-service) ---');
    // Create another quick booking to test alias endpoint /mark-completed
    const b2Create = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        service_id: testService.id,
        problem_title: 'Fan regulator replacement',
        problem_description: 'Ceiling fan runs on high speed only.',
        service_address: '10, 80 Feet Road, Koramangala',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: '2026-09-26',
        scheduled_time_slot: '02:00 PM - 04:00 PM',
        urgency_level: 'low',
      }),
    });
    const b2Id = b2Create.data.booking.id;
    await api(`/bookings/${b2Id}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech1Profile.id }),
    });
    await api(`/bookings/${b2Id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    const b2Start = await api(`/bookings/${b2Id}/start-service`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(b2Start.ok && b2Start.data.booking?.booking_status === 'in_progress', 'Alias PUT /start-service works correctly');

    const b2Complete = await api(`/bookings/${b2Id}/mark-completed`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ service_notes: 'Replaced fan regulator.' }),
    });
    assert(b2Complete.ok && b2Complete.data.booking?.booking_status === 'completed', 'Alias PUT /mark-completed works correctly');

  } catch (err) {
    console.error('Unexpected error during testing:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTechnicianServiceLifecycleTests();
