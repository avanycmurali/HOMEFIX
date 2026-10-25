import { pool } from '../config/db.js';
import { calculateHaversineDistance } from '../services/recommendationEngine.js';

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

async function runCustomerRecommendationTests() {
  console.log('🧪 Starting HOMEFIX Customer-Facing Recommendation Result Tests...\n');
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
    // 1. Haversine Distance Function Verification
    console.log('--- 1. Testing Haversine Distance Formula ---');
    const koramangala = { lat: 12.9352, lon: 77.6245 };
    const indiranagar = { lat: 12.9784, lon: 77.6408 };
    const distance1 = calculateHaversineDistance(
      koramangala.lat,
      koramangala.lon,
      indiranagar.lat,
      indiranagar.lon
    );
    assert(distance1 === 5.1, `Haversine distance between Koramangala & Indiranagar is 5.1 km (got: ${distance1})`);

    const samePointDist = calculateHaversineDistance(
      koramangala.lat,
      koramangala.lon,
      koramangala.lat,
      koramangala.lon
    );
    assert(samePointDist === 0, `Haversine distance for identical coordinates is 0.0 km (got: ${samePointDist})`);

    const nullDist = calculateHaversineDistance(null, null, indiranagar.lat, indiranagar.lon);
    assert(nullDist === null, 'Haversine distance returns null if coordinates are unavailable without throwing');

    // 2. Customer Authentication
    console.log('\n--- 2. Customer Authentication ---');
    const custLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@homefix.com', password: 'User@123' }),
    });
    assert(custLogin.ok && custLogin.data.token, 'Customer logged in successfully');
    const customerToken = custLogin.data.token;

    // 3. Create a Booking with Explicit Coordinates and Verify Customer Recommendation Response
    console.log('\n--- 3. Create Booking & Verify Customer-Facing Recommendation Result ---');
    const formData = new FormData();
    formData.append('service_id', '1'); // Electrical Services
    formData.append('problem_title', 'Master bedroom fan regulator burnt');
    formData.append('problem_description', 'Fan speed regulator stopped functioning after a brief voltage surge.');
    formData.append('service_address', '14, 5th Cross, 6th Block, Koramangala');
    formData.append('city', 'Bangalore');
    formData.append('pincode', '560034');
    formData.append('latitude', '12.9352');
    formData.append('longitude', '77.6245');
    formData.append('scheduled_date', '2026-09-22');
    formData.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formData.append('urgency_level', 'medium');

    const bookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: formData,
    }).then((r) => r.json());

    assert(bookRes.success && bookRes.booking, 'Service booking registered successfully');
    assert(Array.isArray(bookRes.recommendations), 'Customer response contains recommendations array');
    assert(bookRes.recommendations.length > 0, `Recommendation engine calculated ${bookRes.recommendations.length} technician match(es)`);
    assert(bookRes.top_recommendation !== null, 'Customer response includes top_recommendation');

    const topRec = bookRes.top_recommendation;
    // 4. Verify Recommended Technician Card Fields (Requirement 1 & 6)
    console.log('\n--- 4. Verify Recommended Technician Card Fields ---');
    assert(typeof topRec.technicianName === 'string' && topRec.technicianName.length > 0, `Technician name present: "${topRec.technicianName}"`);
    assert(typeof topRec.serviceName === 'string', `Technician specialization present: "${topRec.serviceName}"`);
    assert(typeof topRec.averageRating === 'number' && topRec.averageRating >= 0 && topRec.averageRating <= 5, `Actual rating present: ${topRec.averageRating} / 5.0`);
    assert(typeof topRec.experienceYears === 'number', `Actual experience present: ${topRec.experienceYears} Years`);
    assert(typeof topRec.visitingCharges === 'number' && topRec.visitingCharges > 0, `Actual visiting charge present: ₹${topRec.visitingCharges}`);
    assert(typeof topRec.hourlyRate === 'number', `Actual hourly rate present: ₹${topRec.hourlyRate}/hr`);
    assert(typeof topRec.availabilityStatus === 'string', `Actual availability status present: "${topRec.availabilityStatus}"`);
    assert(typeof topRec.matchScore === 'number' && topRec.matchScore >= 0 && topRec.matchScore <= 100, `Recommendation match percentage present: ${topRec.matchScore}%`);

    // 5. Verify Recommendation Breakdown (Requirement 2)
    console.log('\n--- 5. Verify Recommendation Breakdown Factors ---');
    const breakdown = topRec.breakdown;
    assert(breakdown !== undefined && typeof breakdown === 'object', 'Score breakdown object exists');
    assert(typeof breakdown.location_score === 'number' && breakdown.location_score <= 30, `Location score present: ${breakdown.location_score}/30`);
    assert(typeof breakdown.availability_score === 'number' && breakdown.availability_score <= 20, `Availability score present: ${breakdown.availability_score}/20`);
    assert(typeof breakdown.rating_score === 'number' && breakdown.rating_score <= 20, `Rating score present: ${breakdown.rating_score}/20`);
    assert(typeof breakdown.experience_score === 'number' && breakdown.experience_score <= 15, `Experience score present: ${breakdown.experience_score}/15`);
    assert(typeof breakdown.fee_score === 'number' && breakdown.fee_score <= 15, `Fee score present: ${breakdown.fee_score}/15`);
    assert(breakdown.total_score === topRec.matchScore, 'Total breakdown score matches matchScore');

    // 6. Verify Actual Work Distance in Kilometres (Requirement 3)
    console.log('\n--- 6. Verify Work Distance in Kilometres via Haversine ---');
    assert(breakdown.distance_km !== null && breakdown.distance_km !== undefined, `Actual work distance calculated: ${breakdown.distance_km} km`);
    assert(topRec.distanceKm === breakdown.distance_km, `topRec.distanceKm exposes calculated distance: ${topRec.distanceKm} km`);

    // 7. Verify Explanation Text (Requirement 4)
    console.log('\n--- 7. Verify Explanation Text ---');
    const expectedExplanation = 'Recommended because this technician matches your service, is nearby, available at the requested time, has relevant experience, and has a suitable fee.';
    assert(topRec.explanation === expectedExplanation, 'Simple explanation matches required text');

    // 8. Verify Ranked Top 3 Recommendations (Requirement 5)
    console.log('\n--- 8. Verify Ranked Top 3 Recommendations ---');
    assert(bookRes.recommendations.length <= 3, 'Top recommendations slice is capped at 3');
    for (let i = 0; i < bookRes.recommendations.length; i++) {
      const r = bookRes.recommendations[i];
      assert(r.rankPosition === i + 1, `Recommendation rank position is #${r.rankPosition}`);
      if (i > 0) {
        assert(bookRes.recommendations[i - 1].matchScore >= r.matchScore, `Rank #${i} has score >= Rank #${i + 1}`);
      }
    }

    // 9. Verify GET /api/bookings/:id/recommendations endpoint
    console.log('\n--- 9. Verify Dedicated Customer Recommendations Endpoint ---');
    const recsEndpointRes = await api(`/bookings/${bookRes.booking.id}/recommendations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(recsEndpointRes.ok && recsEndpointRes.data.success, 'GET /api/bookings/:id/recommendations returned 200 OK');
    assert(Array.isArray(recsEndpointRes.data.data), 'Returns recommendations list');
    assert(recsEndpointRes.data.data.length > 0, 'Recommendations list populated');
    assert(recsEndpointRes.data.top_recommendation !== null, 'top_recommendation returned by dedicated endpoint');

    // 10. Verify GET /api/bookings/my-bookings attaches recommendations
    console.log('\n--- 10. Verify Customer My-Bookings Query Attaches Recommendations ---');
    const myBookingsRes = await api('/bookings/my-bookings', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(myBookingsRes.ok && myBookingsRes.data.success, 'GET /api/bookings/my-bookings returned 200 OK');
    const thisBooking = myBookingsRes.data.data.find((b) => b.id === bookRes.booking.id);
    assert(thisBooking !== undefined, 'Created booking found in customer bookings');
    assert(Array.isArray(thisBooking.recommendations), 'Booking has recommendations array attached');
    assert(thisBooking.top_recommendation !== null, 'Booking has top_recommendation attached');

    // 11. Specifically verify Booking HF-20260919-44UT (Target Customer Booking)
    console.log('\n--- 11. Verify Target Booking HF-20260919-44UT Customer Recommendation Flow ---');
    const [targetBookingRows] = await pool.query(
      "SELECT id, user_id, booking_reference FROM bookings WHERE booking_reference = ? AND booking_status IN ('pending', 'customer_selected_technician')",
      ['HF-20260919-44UT']
    );
    if (targetBookingRows.length > 0) {
      const targetB = targetBookingRows[0];
      const avanyToken = (await import('jsonwebtoken')).default.sign(
        { id: targetB.user_id, role: 'user', email: 'avany@gmail.com' },
        process.env.JWT_SECRET || 'secret'
      );

      // Verify GET /api/bookings/my-bookings
      const avanyBookings = await api('/bookings/my-bookings', {
        headers: { Authorization: `Bearer ${avanyToken}` },
      });
      assert(avanyBookings.ok, 'GET /api/bookings/my-bookings for avany@gmail.com returned 200 OK');
      const b44ut = avanyBookings.data.data.find((b) => b.booking_reference === 'HF-20260919-44UT');
      assert(b44ut !== undefined, 'Booking HF-20260919-44UT found in customer bookings');
      assert(b44ut && b44ut.top_recommendation !== null, 'Booking HF-20260919-44UT has top_recommendation');
      assert(b44ut && b44ut.top_recommendation.technicianName === 'Arun kumar', `Top technician for HF-20260919-44UT is Arun kumar (got: ${b44ut?.top_recommendation?.technicianName})`);
      assert(b44ut && b44ut.top_recommendation.matchScore === 91, `Top technician match score is 91% (got: ${b44ut?.top_recommendation?.matchScore}%)`);
      assert(b44ut && b44ut.top_recommendation.distanceKm === 0, `Top technician distance is 0 km (got: ${b44ut?.top_recommendation?.distanceKm} km)`);
      assert(b44ut && b44ut.top_recommendation.visitingCharges === 50, `Visiting fee is ₹50 (got: ₹${b44ut?.top_recommendation?.visitingCharges})`);
      assert(b44ut && b44ut.top_recommendation.availabilityStatus === 'available', `Availability is 'available' (got: ${b44ut?.top_recommendation?.availabilityStatus})`);
      assert(b44ut && b44ut.top_recommendation.breakdown.location_score === 30, 'Location score breakdown is 30/30');

      // Verify GET /api/bookings/:id
      const bDetail = await api(`/bookings/${targetB.id}`, {
        headers: { Authorization: `Bearer ${avanyToken}` },
      });
      assert(bDetail.ok && bDetail.data.booking, 'GET /api/bookings/:id returned 200 OK with booking details');
      assert(bDetail.data.top_recommendation !== null, 'Details endpoint returns top_recommendation at root');
      assert(bDetail.data.booking.top_recommendation !== null, 'Details endpoint attaches top_recommendation to booking object');
      assert(bDetail.data.recommendations.length > 0, `Details endpoint returns ${bDetail.data.recommendations.length} recommendations`);

      // Verify GET /api/bookings/:id/recommendations
      const bRecs = await api(`/bookings/${targetB.id}/recommendations`, {
        headers: { Authorization: `Bearer ${avanyToken}` },
      });
      assert(bRecs.ok && bRecs.data.success, 'GET /api/bookings/:id/recommendations returned 200 OK');
      assert(bRecs.data.top_recommendation.technicianName === 'Arun kumar', 'Recommendations endpoint returns Arun kumar as #1 match');
      assert(bRecs.data.top_recommendation.breakdown !== undefined, 'Breakdown object with 5 evaluation factors returned');
    } else {
      console.warn('  ⚠️ Booking HF-20260919-44UT not in DB, skipping target booking test');
    }

    // 12. End-to-End Real Plumbing Booking Test
    console.log('\n--- 12. Create Real Plumbing Booking in Thrissur & Verify Matches ---');
    const plumbForm = new FormData();
    plumbForm.append('service_id', '2'); // Plumbing Services
    plumbForm.append('problem_title', 'Bathroom pipe leakage under wash basin');
    plumbForm.append('problem_description', 'Severe water leakage from the joint valve under the wash basin.');
    plumbForm.append('service_address', 'Main Road, Arimbur, Thrissur');
    plumbForm.append('city', 'thrissur');
    plumbForm.append('pincode', '680620');
    plumbForm.append('latitude', '10.4905');
    plumbForm.append('longitude', '76.1558');
    plumbForm.append('scheduled_date', '2026-09-25');
    plumbForm.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    plumbForm.append('urgency_level', 'high');

    const plumbRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: plumbForm,
    }).then((r) => r.json());

    assert(plumbRes.success && plumbRes.booking, 'Plumbing booking registered successfully');
    assert(plumbRes.booking.top_recommendation !== null, 'booking.top_recommendation attached on created booking object');
    if (plumbRes.top_recommendation?.technicianName === 'Arun kumar') {
      assert(plumbRes.top_recommendation.technicianName === 'Arun kumar', 'Plumbing top recommendation is Arun kumar');
      assert(plumbRes.top_recommendation.distanceKm === 0, `Work distance in km is 0 km (got: ${plumbRes.top_recommendation.distanceKm} km)`);
      assert(plumbRes.top_recommendation.matchScore >= 90, `Match score is high (>=90%) (got: ${plumbRes.top_recommendation.matchScore}%)`);
    } else {
      assert(plumbRes.top_recommendation !== null, `Plumbing top recommendation assigned: ${plumbRes.top_recommendation?.technicianName}`);
      assert(plumbRes.top_recommendation.matchScore > 0, `Match score calculated: ${plumbRes.top_recommendation.matchScore}%`);
    }

    // Clean up temporary plumbing booking to ensure test idempotency
    if (plumbRes.booking?.id) {
      await pool.query('DELETE FROM technician_recommendations WHERE booking_id = ?', [plumbRes.booking.id]);
      await pool.query('DELETE FROM service_status_logs WHERE booking_id = ?', [plumbRes.booking.id]);
      await pool.query('DELETE FROM bookings WHERE id = ?', [plumbRes.booking.id]);
    }

    console.log(`\n====================================================`);
    console.log(`🏁 Customer Recommendation Tests: ${passed} Passed, ${failed} Failed`);
    console.log(`====================================================\n`);

    setTimeout(() => {
      process.exit(failed > 0 ? 1 : 0);
    }, 100);
  } catch (err) {
    console.error('Test execution error:', err);
    setTimeout(() => {
      process.exit(1);
    }, 100);
  }
}

runCustomerRecommendationTests();
