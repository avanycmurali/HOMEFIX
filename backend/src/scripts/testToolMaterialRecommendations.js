import { pool } from '../config/db.js';
import { getToolMaterialRecommendations } from '../services/toolMaterialRecommendationEngine.js';

const BASE_URL = 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  try {
    const res = await fetch(url, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // response without json body
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 500, ok: false, error: err.message };
  }
}

async function runTests() {
  console.log('\n🧪 Starting HOMEFIX Module 4: Intelligent Tool & Material Recommendation Tests...\n');

  // =========================================================================
  // PART 1: UNIT TESTS ON RULE-BASED RECOMMENDATION ENGINE
  // =========================================================================

  // 1. Plumbing leak complaint returns appropriate tools
  console.log('--- 1. Plumbing Leak Complaint -> Tools ---');
  const plumbLeak = getToolMaterialRecommendations('Plumbing', 'Kitchen sink is leaking', 'Water dripping under cabinet');
  assert(plumbLeak.matched === true, 'Plumbing leak matches recommendation rules');
  const plumbLeakToolNames = plumbLeak.tools.map((t) => t.name.toLowerCase());
  assert(
    plumbLeakToolNames.includes('adjustable wrench') && plumbLeakToolNames.includes('pipe wrench'),
    'Plumbing leak returns appropriate tools (Adjustable wrench, Pipe wrench)'
  );
  assert(
    plumbLeak.tools.every((t) => typeof t.reason === 'string' && t.reason.length > 5),
    'Each recommended tool includes a descriptive reason'
  );

  // 2. Plumbing leak complaint returns appropriate materials
  console.log('\n--- 2. Plumbing Leak Complaint -> Materials ---');
  const plumbLeakMatNames = plumbLeak.materials.map((m) => m.name.toLowerCase());
  assert(
    plumbLeakMatNames.some((m) => m.includes('teflon') || m.includes('ptfe')) &&
      plumbLeakMatNames.some((m) => m.includes('washer')) &&
      plumbLeakMatNames.some((m) => m.includes('sealant')),
    'Plumbing leak returns appropriate materials (PTFE/Teflon tape, Replacement washer, Pipe sealant)'
  );
  assert(
    plumbLeak.materials.every((m) => typeof m.reason === 'string' && m.reason.length > 5),
    'Each recommended material includes a descriptive reason'
  );

  // 3. Electrical complaint returns appropriate tools/materials
  console.log('\n--- 3. Electrical Complaint -> Tools & Materials ---');
  const elecFan = getToolMaterialRecommendations('Electrical', 'Ceiling fan not working', 'Fan is slow and making humming noise');
  assert(elecFan.matched === true, 'Electrical fan complaint matches rules');
  const elecToolNames = elecFan.tools.map((t) => t.name.toLowerCase());
  const elecMatNames = elecFan.materials.map((m) => m.name.toLowerCase());
  assert(
    elecToolNames.includes('voltage tester') && elecToolNames.includes('multimeter'),
    'Electrical fan complaint returns Voltage tester and Multimeter'
  );
  assert(
    elecMatNames.includes('electrical tape') && elecMatNames.some((m) => m.includes('capacitor')),
    'Electrical fan complaint returns Electrical tape and Replacement capacitor'
  );
  assert(typeof elecFan.safetyGuideline === 'string' && elecFan.safetyGuideline.includes('MCB'), 'Includes MCB electrical safety guidance');

  // 4. Carpentry complaint returns appropriate tools/materials
  console.log('\n--- 4. Carpentry Complaint -> Tools & Materials ---');
  const carpDoor = getToolMaterialRecommendations('Carpentry', 'Front door problem', 'Door lock and hinges creaking and sticking');
  assert(carpDoor.matched === true, 'Carpentry door complaint matches rules');
  const carpToolNames = carpDoor.tools.map((t) => t.name.toLowerCase());
  const carpMatNames = carpDoor.materials.map((m) => m.name.toLowerCase());
  assert(
    carpToolNames.includes('screwdriver set') && carpToolNames.includes('drill'),
    'Carpentry returns Screwdriver set and Drill'
  );
  assert(
    carpMatNames.includes('screws') && carpMatNames.some((m) => m.includes('hinge')),
    'Carpentry returns Screws and Hinges'
  );

  // 5. Painting complaint returns appropriate tools/materials
  console.log('\n--- 5. Painting Complaint -> Tools & Materials ---');
  const paintWall = getToolMaterialRecommendations('Painting', 'Living room wall painting', 'Need interior repaint and touch up');
  assert(paintWall.matched === true, 'Painting complaint matches rules');
  const paintToolNames = paintWall.tools.map((t) => t.name.toLowerCase());
  const paintMatNames = paintWall.materials.map((m) => m.name.toLowerCase());
  assert(
    paintToolNames.includes('paint roller') && paintToolNames.includes('paint brush'),
    'Painting returns Paint roller and Paint brush'
  );
  assert(
    paintMatNames.includes('paint') && paintMatNames.some((m) => m.includes('primer')),
    'Painting returns Paint and Wall primer'
  );

  // 6. Appliance repair complaint returns appropriate tools/materials
  console.log('\n--- 6. Appliance Repair Complaint -> Tools & Materials ---');
  const appliance = getToolMaterialRecommendations('Appliance Repair', 'Microwave appliance not working', 'Oven is dead and not heating');
  assert(appliance.matched === true, 'Appliance repair complaint matches rules');
  const appToolNames = appliance.tools.map((t) => t.name.toLowerCase());
  const appMatNames = appliance.materials.map((m) => m.name.toLowerCase());
  assert(
    appToolNames.includes('multimeter') && appToolNames.includes('voltage tester'),
    'Appliance repair returns Multimeter and Voltage tester'
  );
  assert(
    appMatNames.some((m) => m.includes('fuse')),
    'Appliance repair returns Replacement fuse'
  );

  // 7. AC complaint returns appropriate tools/materials
  console.log('\n--- 7. AC Complaint -> Tools & Materials ---');
  const acService = getToolMaterialRecommendations('AC Servicing', 'Split AC not cooling', 'Warm air blowing, possible refrigerant gas leak');
  assert(acService.matched === true, 'AC servicing complaint matches rules');
  const acToolNames = acService.tools.map((t) => t.name.toLowerCase());
  const acMatNames = acService.materials.map((m) => m.name.toLowerCase());
  assert(
    acToolNames.includes('manifold gauge set') && acToolNames.includes('thermometer'),
    'AC servicing returns Manifold gauge set and Thermometer'
  );
  assert(
    acMatNames.some((m) => m.includes('refrigerant')),
    'AC servicing returns Appropriate refrigerant'
  );

  // 8. Cleaning complaint returns appropriate tools/materials
  console.log('\n--- 8. Cleaning Complaint -> Tools & Materials ---');
  const cleaning = getToolMaterialRecommendations('Cleaning', 'Deep home cleaning service', 'Sanitization and kitchen scrubbing');
  assert(cleaning.matched === true, 'Cleaning complaint matches rules');
  const cleanToolNames = cleaning.tools.map((t) => t.name.toLowerCase());
  const cleanMatNames = cleaning.materials.map((m) => m.name.toLowerCase());
  assert(
    cleanToolNames.includes('vacuum cleaner') && cleanToolNames.includes('scrub brush'),
    'Cleaning returns Vacuum cleaner and Scrub brush'
  );
  assert(
    cleanMatNames.includes('disinfectant') && cleanMatNames.includes('gloves'),
    'Cleaning returns Disinfectant and Gloves'
  );

  // 9. Case-insensitive matching
  console.log('\n--- 9. Case-Insensitive Matching ---');
  const caseInsensitive = getToolMaterialRecommendations(
    'PLUMBING',
    'LEAKING WATER PIPE IN BATHROOM',
    'DRIPPING AND SEEPAGE'
  );
  assert(caseInsensitive.matched === true, 'Matches uppercase category and complaint text');
  assert(caseInsensitive.tools.length >= 3, 'Returns full set of tools regardless of case');

  // 10. Multiple keywords produce combined recommendations
  console.log('\n--- 10. Multiple Keywords Produce Combined Recommendations ---');
  const combined = getToolMaterialRecommendations(
    'Plumbing',
    'Kitchen sink tap is leaking and blocked',
    'Drainage clogged under tap fixture'
  );
  assert(combined.matched === true, 'Matches multiple distinct rules (leak + blocked + tap)');
  const combinedToolNames = combined.tools.map((t) => t.name.toLowerCase());
  assert(
    combinedToolNames.includes('adjustable wrench') &&
      combinedToolNames.includes('drain snake') &&
      combinedToolNames.includes('plunger'),
    'Combined rules include tools from both leak rules and blockage rules'
  );

  // 11. Duplicate suggestions are removed
  console.log('\n--- 11. Duplicate Suggestions are Removed ---');
  const uniqueToolNames = new Set(combined.tools.map((t) => t.name.toLowerCase()));
  assert(uniqueToolNames.size === combined.tools.length, 'No duplicate tools in combined output');
  const uniqueMatNames = new Set(combined.materials.map((m) => m.name.toLowerCase()));
  assert(uniqueMatNames.size === combined.materials.length, 'No duplicate materials in combined output');

  // 12. Unknown complaint returns a safe empty/fallback response
  console.log('\n--- 12. Unknown Complaint Returns Safe Empty/Fallback Response ---');
  const unknown = getToolMaterialRecommendations('Plumbing', 'Mysterious sound in wall', 'No standard keywords here');
  assert(unknown.matched === false, 'Flags matched as false for unknown keywords');
  assert(Array.isArray(unknown.tools) && unknown.tools.length === 0, 'Returns safe empty tools array');
  assert(Array.isArray(unknown.materials) && unknown.materials.length === 0, 'Returns safe empty materials array');
  assert(typeof unknown.safetyGuideline === 'string', 'Still provides trade safety guideline fallback');

  // 13. Missing complaint text handled safely
  console.log('\n--- 13. Missing Complaint Text Handled Safely ---');
  let missingTextNoThrow = false;
  try {
    const missing = getToolMaterialRecommendations('Plumbing', null, undefined);
    assert(missing.matched === false, 'Handles null/undefined complaint text safely');
    assert(Array.isArray(missing.tools) && missing.tools.length === 0, 'Safe tools array on null inputs');
    missingTextNoThrow = true;
  } catch (err) {
    missingTextNoThrow = false;
  }
  assert(missingTextNoThrow, 'Engine never throws error on missing/empty inputs');

  // =========================================================================
  // PART 2: END-TO-END WORKFLOW, AUTHORIZATION, AND DATABASE PERSISTENCE
  // =========================================================================
  const timestamp = Date.now();
  const customerEmail = `test_tm_cust_${timestamp}@homefix.com`;
  const tech1Email = `test_tm_tech1_${timestamp}@homefix.com`;
  const tech2Email = `test_tm_tech2_${timestamp}@homefix.com`;
  const testPassword = 'Password123!';

  let customerToken = null;
  let customerId = null;
  let tech1Token = null;
  let tech1UserId = null;
  let tech1ProfileId = null;
  let tech2Token = null;
  let tech2UserId = null;
  let tech2ProfileId = null;
  let testBookingId = null;

  try {
    console.log('\n--- Setup Test Accounts ---');

    // Register Customer
    const custReg = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'TM Customer',
        email: customerEmail,
        password: testPassword,
        phone: `981${String(timestamp).slice(-7)}`,
        city: 'Bangalore',
        pincode: '560034',
        address: '123 Test Street, Koramangala',
      }),
    });
    assert(custReg.ok, 'Test customer registered');
    customerToken = custReg.data.token;
    customerId = custReg.data.user.id;

    // Register Assigned Technician (Plumbing - service_id: 2)
    const tech1Reg = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Arun Assigned Plumber',
        email: tech1Email,
        password: testPassword,
        phone: `982${String(timestamp).slice(-7)}`,
        city: 'Bangalore',
        pincode: '560034',
        address: '456 Tech Lane',
        service_id: 2,
        experience_years: 5,
        qualification: 'Master Plumber',
        hourly_rate: 250,
        visiting_charges: 150,
        service_area: 'Koramangala',
        latitude: 12.9352,
        longitude: 77.6245,
      }),
    });
    assert(tech1Reg.ok, 'Assigned technician registered');
    tech1Token = tech1Reg.data.token;
    tech1UserId = tech1Reg.data.user.id;

    const [tech1Rows] = await pool.query('SELECT id FROM technician_profiles WHERE user_id = ?', [tech1UserId]);
    tech1ProfileId = tech1Rows[0].id;

    // Register Unassigned Technician (Plumbing - service_id: 2)
    const tech2Reg = await api('/auth/register-technician', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Vikram Other Plumber',
        email: tech2Email,
        password: testPassword,
        phone: `983${String(timestamp).slice(-7)}`,
        city: 'Bangalore',
        pincode: '560034',
        address: '789 Other Lane',
        service_id: 2,
        experience_years: 4,
        qualification: 'Certified Plumber',
        hourly_rate: 220,
        visiting_charges: 140,
        service_area: 'Koramangala',
        latitude: 12.9355,
        longitude: 77.625,
      }),
    });
    assert(tech2Reg.ok, 'Second unassigned technician registered');
    tech2Token = tech2Reg.data.token;
    tech2UserId = tech2Reg.data.user.id;

    const [tech2Rows] = await pool.query('SELECT id FROM technician_profiles WHERE user_id = ?', [tech2UserId]);
    tech2ProfileId = tech2Rows[0].id;
    await pool.query("UPDATE technician_profiles SET verification_status = 'verified' WHERE user_id IN (?, ?)", [tech1UserId, tech2UserId]);

    // Customer creates booking (Plumbing leakage)
    const bookingRes = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        service_id: 2,
        problem_title: 'Kitchen sink pipe is leaking',
        problem_description: 'Water dripping continuously under the sink cabinet, replacement washer and pipe seal needed',
        service_address: '123 Test Street, Koramangala',
        city: 'Bangalore',
        pincode: '560034',
        scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduled_time_slot: '10:00 AM - 12:00 PM',
        urgency_level: 'medium',
      }),
    });
    assert(bookingRes.ok, 'Customer booking created successfully');
    testBookingId = bookingRes.data.booking.id;

    // Customer selects Tech 1
    const selectRes = await api(`/bookings/${testBookingId}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: tech1ProfileId }),
    });
    assert(selectRes.ok, 'Customer selected Technician 1');

    // Tech 1 accepts booking
    const acceptRes = await api(`/bookings/${testBookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(acceptRes.ok, 'Technician 1 accepted booking (status is now accepted)');

    // 14. Unauthorized user rejected (no token)
    console.log('\n--- 14. Unauthorized User Rejected ---');
    const unauthRes = await api(`/bookings/${testBookingId}/tool-material-suggestions`);
    assert(unauthRes.status === 401, `Unauthenticated request returns HTTP 401 (got: ${unauthRes.status})`);

    // 15. Customer cannot access technician-only endpoint
    console.log('\n--- 15. Customer Rejected from Technician-Only Endpoint ---');
    const custAccessRes = await api(`/bookings/${testBookingId}/tool-material-suggestions`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custAccessRes.status === 403, `Customer access returns HTTP 403 Forbidden (got: ${custAccessRes.status})`);

    // 16. Technician cannot access another technician's booking
    console.log('\n--- 16. Unassigned Technician Rejected ---');
    const unassignedTechRes = await api(`/bookings/${testBookingId}/tool-material-suggestions`, {
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    assert(
      unassignedTechRes.status === 403,
      `Unassigned technician returns HTTP 403 Forbidden (got: ${unassignedTechRes.status})`
    );

    // 17. Correct assigned technician can access recommendations
    console.log('\n--- 17. Assigned Technician Accesses Recommendations ---');
    const assignedTechRes = await api(`/bookings/${testBookingId}/tool-material-suggestions`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(assignedTechRes.status === 200, `Assigned technician receives HTTP 200 OK (got: ${assignedTechRes.status})`);
    assert(assignedTechRes.data.success === true, 'Response indicates success: true');
    assert(Array.isArray(assignedTechRes.data.tools) && assignedTechRes.data.tools.length > 0, 'Returns tools array');
    assert(Array.isArray(assignedTechRes.data.materials) && assignedTechRes.data.materials.length > 0, 'Returns materials array');
    assert(typeof assignedTechRes.data.safety_guidelines === 'string', 'Returns safety guidelines');
    assert(assignedTechRes.data.service.name === 'Plumbing Services', 'Returns correct service context');
    assert(assignedTechRes.data.complaint.title === 'Kitchen sink pipe is leaking', 'Returns complaint title');

    // 18. Recommendations are persisted correctly in MySQL
    console.log('\n--- 18. Recommendations Persisted in MySQL ---');
    const [dbSuggestions] = await pool.query(
      'SELECT id, suggestion_type, suggestion_name, reason, booking_id, technician_id FROM tool_material_suggestions WHERE booking_id = ?',
      [testBookingId]
    );
    assert(dbSuggestions.length > 0, `Persisted ${dbSuggestions.length} recommendation rows in tool_material_suggestions table`);
    assert(
      dbSuggestions.every((r) => r.booking_id === testBookingId),
      'All rows reference the correct booking_id'
    );
    assert(
      dbSuggestions.some((r) => r.suggestion_type === 'tool') && dbSuggestions.some((r) => r.suggestion_type === 'material'),
      'Persisted rows contain both tool and material types'
    );

    // Test cached response returns source persisted
    const cachedRes = await api(`/bookings/${testBookingId}/tool-material-suggestions`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(cachedRes.status === 200, 'Subsequent fetch returns HTTP 200 OK');
    assert(cachedRes.data.tools.length === assignedTechRes.data.tools.length, 'Cached tools match original generation');

    // 19. Existing booking workflow still works
    console.log('\n--- 19. Existing Booking Workflow Intact ---');
    const bookingDetailsRes = await api(`/bookings/${testBookingId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(bookingDetailsRes.ok, 'Customer can fetch booking details without regressions');
    assert(bookingDetailsRes.data.booking.booking_status === 'accepted', 'Booking status remains accepted');

    // 20. Existing service lifecycle still works (Start -> Complete)
    console.log('\n--- 20. Existing Service Lifecycle Intact ---');
    const startRes = await api(`/bookings/${testBookingId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(startRes.ok, 'Technician can start service (accepted -> in_progress)');

    const completeRes = await api(`/bookings/${testBookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ service_notes: 'Replaced pipe washer and sealed joint with Teflon tape.' }),
    });
    assert(completeRes.ok, 'Technician can complete service (in_progress -> completed)');
    assert(completeRes.data.booking.booking_status === 'completed', 'Booking marked completed in database');
    assert(completeRes.data.service_notes != null, 'Service notes stored successfully');

    // Recommendations remain accessible after completion as part of service history
    const historyRecRes = await api(`/bookings/${testBookingId}/tool-material-suggestions`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    assert(historyRecRes.status === 200, 'Recommendations remain accessible for completed bookings in service history');
  } finally {
    // Cleanup temporary test data (only rows created for this test run)
    console.log('\n--- Cleanup Test Data ---');
    if (testBookingId) {
      await pool.query('DELETE FROM tool_material_suggestions WHERE booking_id = ?', [testBookingId]);
      await pool.query('DELETE FROM service_status_logs WHERE booking_id = ?', [testBookingId]);
      await pool.query('DELETE FROM bookings WHERE id = ?', [testBookingId]);
    }
    if (tech1ProfileId) {
      await pool.query('DELETE FROM technician_profiles WHERE id = ?', [tech1ProfileId]);
    }
    if (tech2ProfileId) {
      await pool.query('DELETE FROM technician_profiles WHERE id = ?', [tech2ProfileId]);
    }
    await pool.query('DELETE FROM users WHERE email LIKE "test_tm_%"');
    console.log('  ✅ Temporary test data cleaned up.');
  }

  console.log('\n==================================================');
  console.log(`Tool & Material Recommendation Test Results: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled test failure:', err);
    process.exit(1);
  });
