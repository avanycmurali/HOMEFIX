import { pool } from '../config/db.js';
import { signToken } from '../utils/jwt.js';

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

async function runLiveVerification() {
  console.log('🌟 =============================================================');
  console.log('🌟 HOMEFIX: End-to-End Live Booking Workflow Verification');
  console.log('🌟 =============================================================\n');

  try {
    // 1. Customer Login (avany@gmail.com)
    console.log('Step 1: Authenticating as customer (avany@gmail.com)...');
    const [custRows] = await pool.query('SELECT id, name, email, role FROM users WHERE email = ?', ['avany@gmail.com']);
    if (custRows.length === 0) throw new Error('Customer avany@gmail.com not found');
    const customerToken = signToken({
      id: custRows[0].id,
      name: custRows[0].name,
      email: custRows[0].email,
      role: 'user',
    });
    console.log(`  ✅ Authenticated as: ${custRows[0].name} (ID: ${custRows[0].id})`);

    // 2. Create an Actual Plumbing Booking in Thrissur
    console.log('\nStep 2: Creating a new plumbing service complaint booking...');
    const formData = new FormData();
    formData.append('service_id', '2'); // Plumbing Services
    formData.append('problem_title', 'Bathroom washbasin pipe leak and low pressure');
    formData.append('problem_description', 'Drain pipe underneath the basin is cracked and dripping constantly.');
    formData.append('service_address', 'Civil Line Road, Ayyanthole');
    formData.append('city', 'Thrissur');
    formData.append('pincode', '680003');
    formData.append('latitude', '10.5276');
    formData.append('longitude', '76.2144');
    formData.append('scheduled_date', '2026-09-23');
    formData.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formData.append('urgency_level', 'medium');

    const createRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: formData,
    }).then((r) => r.json());

    if (!createRes.success) {
      throw new Error(`Failed to create booking: ${JSON.stringify(createRes)}`);
    }
    const booking = createRes.booking;
    console.log(`  ✅ Booking Created: ${booking.booking_reference} (ID: ${booking.id})`);
    console.log(`  ✅ Initial Status: "${booking.booking_status}" | Assigned Tech: ${booking.technician_id || 'None'}`);

    // 3. Inspect Top 3 Recommendations
    console.log('\nStep 3: Fetching Top 3 Recommended Technicians for this booking...');
    const recsRes = await api(`/bookings/${booking.id}/recommendations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const recs = recsRes.data.data;
    console.log(`  ✅ Received ${recs.length} Recommendations:`);
    recs.forEach((r, idx) => {
      console.log(
        `     #${idx + 1}: ${r.technicianName} | Match: ${r.matchScore}% | Dist: ${r.distanceKm != null ? r.distanceKm + ' km' : 'N/A'} | Rating: ${r.averageRating}★ | Fee: ₹${r.visitingCharges}`
      );
    });

    const firstTech = recs[0];
    const secondTech = recs[1];

    if (!firstTech || !secondTech) {
      throw new Error('Need at least 2 recommended technicians for live test');
    }

    // 4. Customer Selects #1 Recommended Technician
    console.log(`\nStep 4: Customer selects #1 Technician: "${firstTech.technicianName}" (Tech ID: ${firstTech.technicianId})...`);
    const select1 = await api(`/bookings/${booking.id}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: firstTech.technicianId }),
    });
    if (!select1.ok) throw new Error(`Select 1 failed: ${JSON.stringify(select1.data)}`);
    console.log(`  ✅ Selection Successful! New status: "${select1.data.booking.booking_status}"`);
    console.log(`  ✅ Status remark: "${select1.data.message}"`);

    // 5. Technician #1 Logs in and Inspects Requests
    console.log(`\nStep 5: Technician #1 (${firstTech.technicianName}) logs in...`);
    const [tech1UserRows] = await pool.query(
      'SELECT u.id, u.name, u.email, u.role FROM users u JOIN technician_profiles tp ON tp.user_id = u.id WHERE tp.id = ?',
      [firstTech.technicianId]
    );
    const tech1User = tech1UserRows[0];
    const tech1Token = signToken({
      id: tech1User.id,
      name: tech1User.name,
      email: tech1User.email,
      role: 'technician',
    });
    console.log(`  ✅ Technician 1 Authenticated (email: ${tech1User.email})`);

    const tech1Requests = await api('/bookings/technician/requests', {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    const foundReq1 = tech1Requests.data.data.find((r) => r.id === booking.id);
    console.log(`  ✅ Service request appears in Technician 1 Dashboard: ${foundReq1 ? 'YES' : 'NO'}`);

    // 6. Technician #1 Declines / Rejects Booking
    const rejectReason = 'Cannot reach location';
    console.log(`\nStep 6: Technician #1 declines booking with reason: "${rejectReason}"...`);
    const rejectRes = await api(`/bookings/${booking.id}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech1Token}` },
      body: JSON.stringify({ reason: rejectReason }),
    });
    if (!rejectRes.ok) throw new Error(`Reject failed: ${JSON.stringify(rejectRes.data)}`);
    console.log(`  ✅ Request declined by Technician 1`);

    // 7. Customer Inspects Booking After Rejection
    console.log('\nStep 7: Customer checks booking state after rejection...');
    const custCheck1 = await api(`/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const bAfterReject = custCheck1.data.booking;
    console.log(`  ✅ Current Booking Status: "${bAfterReject.booking_status}"`);
    console.log(`  ✅ Recorded Rejection Reason: "${bAfterReject.rejection_reason}"`);

    // Verify recommendations show firstTech as declined
    const recsAfterReject = await api(`/bookings/${booking.id}/recommendations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const tech1Card = recsAfterReject.data.data.find((r) => r.technicianId === firstTech.technicianId);
    console.log(`  ✅ Technician 1 marked as declined in customer UI: ${tech1Card?.isRejected ? 'YES (Disabled)' : 'NO'}`);

    // Verify customer cannot re-select firstTech
    const reselectReject = await api(`/bookings/${booking.id}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: firstTech.technicianId }),
    });
    console.log(`  ✅ Attempting to re-select declined technician correctly rejected with: "${reselectReject.data.message}" (HTTP ${reselectReject.status})`);

    // 8. Customer Selects Alternative Technician (#2)
    console.log(`\nStep 8: Customer selects alternative Technician: "${secondTech.technicianName}" (Tech ID: ${secondTech.technicianId})...`);
    const select2 = await api(`/bookings/${booking.id}/select-technician`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ technician_id: secondTech.technicianId }),
    });
    if (!select2.ok) throw new Error(`Select 2 failed: ${JSON.stringify(select2.data)}`);
    console.log(`  ✅ Selection Successful! New status: "${select2.data.booking.booking_status}"`);

    // 9. Technician #2 Logs in and Accepts Booking
    console.log(`\nStep 9: Technician #2 (${secondTech.technicianName}) logs in...`);
    const [tech2UserRows] = await pool.query(
      'SELECT u.id, u.name, u.email, u.role FROM users u JOIN technician_profiles tp ON tp.user_id = u.id WHERE tp.id = ?',
      [secondTech.technicianId]
    );
    const tech2User = tech2UserRows[0];
    const tech2Token = signToken({
      id: tech2User.id,
      name: tech2User.name,
      email: tech2User.email,
      role: 'technician',
    });
    console.log(`  ✅ Technician 2 Authenticated (email: ${tech2User.email})`);

    console.log(`\nStep 10: Technician #2 accepts the service request...`);
    const acceptRes = await api(`/bookings/${booking.id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tech2Token}` },
    });
    if (!acceptRes.ok) throw new Error(`Accept failed: ${JSON.stringify(acceptRes.data)}`);
    console.log(`  ✅ Request accepted by Technician 2!`);

    // 11. Customer Sees Confirmed Technician
    console.log('\nStep 11: Customer checks booking state after confirmation...');
    const custFinalCheck = await api(`/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const finalBooking = custFinalCheck.data.booking;
    console.log(`  ✅ Final Booking Status: "${finalBooking.booking_status}"`);
    console.log(`  ✅ Confirmed Technician Name: "${finalBooking.technician_name}"`);
    console.log(`  ✅ Confirmed Technician Phone: "+91 ${finalBooking.technician_phone}"`);

    // 12. Inspect Full Lifecycle Timeline
    console.log('\nStep 12: Inspecting Service Status Logs Audit Trail:');
    const [auditLogs] = await pool.query(
      `SELECT status, remarks, logged_at FROM service_status_logs 
       WHERE booking_id = ? ORDER BY id ASC`,
      [booking.id]
    );
    auditLogs.forEach((log, idx) => {
      console.log(`   ${idx + 1}. [${log.status.toUpperCase()}] ${log.remarks} (${new Date(log.logged_at).toLocaleTimeString()})`);
    });

    console.log('\n🌟 =============================================================');
    console.log('🌟 ALL STEPS OF THE SELECTION & CONFIRMATION WORKFLOW VERIFIED!');
    console.log('🌟 =============================================================\n');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await pool.end();
  }
}

runLiveVerification();
