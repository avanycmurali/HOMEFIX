import { pool } from '../config/db.js';

/**
 * HOMEFIX Intelligent Technician Recommendation Engine
 * Matches service bookings with technicians based on 6 core criteria:
 * 1. Service Category / Specialization (Prerequisite filter)
 * 2. Location & Service Coverage Area (Up to 30 pts) + Haversine distance
 * 3. Availability & Schedule Conflicts (Up to 20 pts)
 * 4. Customer Rating & Reviews (Up to 20 pts)
 * 5. Experience Years (Up to 15 pts)
 * 6. Visiting Charges & Hourly Affordability (Up to 15 pts)
 * Total Score = 0 - 100 pts
 */

/**
 * Known real-world geographic coordinates for standard service pincodes.
 * Used when explicit coordinates (latitude/longitude) are not directly input in the form.
 */
export const PINCODE_COORDINATES = {
  // Bangalore
  '560001': { lat: 12.9716, lon: 77.5946 }, // Bangalore GPO / Central
  '560025': { lat: 12.9723, lon: 77.6083 }, // Brigade Road / Ashok Nagar
  '560034': { lat: 12.9352, lon: 77.6245 }, // Koramangala
  '560038': { lat: 12.9784, lon: 77.6408 }, // Indiranagar
  '560076': { lat: 12.9063, lon: 77.6050 }, // BTM Layout
  '560078': { lat: 12.9081, lon: 77.5855 }, // JP Nagar
  // Thrissur
  '680620': { lat: 10.4905, lon: 76.1558 }, // Arimbur / Thrissur
  '680001': { lat: 10.5276, lon: 76.2144 }, // Thrissur Town
};

/**
 * Standard Haversine distance formula to calculate great-circle distance between two points on Earth.
 * @param {number} lat1 Latitude of point 1 (in degrees)
 * @param {number} lon1 Longitude of point 1 (in degrees)
 * @param {number} lat2 Latitude of point 2 (in degrees)
 * @param {number} lon2 Longitude of point 2 (in degrees)
 * @returns {number|null} Distance in kilometers rounded to 1 decimal place, or null if coordinates are unavailable
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === null || lat1 === undefined || isNaN(Number(lat1)) ||
    lon1 === null || lon1 === undefined || isNaN(Number(lon1)) ||
    lat2 === null || lat2 === undefined || isNaN(Number(lat2)) ||
    lon2 === null || lon2 === undefined || isNaN(Number(lon2))
  ) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers

  const phi1 = toRad(Number(lat1));
  const phi2 = toRad(Number(lat2));
  const deltaPhi = toRad(Number(lat2) - Number(lat1));
  const deltaLambda = toRad(Number(lon2) - Number(lon1));

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceKm = R * c;
  return Math.round(distanceKm * 10) / 10;
};

/**
 * Resolve coordinates for an entity (booking or technician profile).
 * Prioritizes direct latitude/longitude columns if available in database,
 * falling back to verified geographic pincode lookup.
 */
export const resolveCoordinates = (entity) => {
  if (entity?.latitude != null && entity?.longitude != null) {
    const lat = parseFloat(entity.latitude);
    const lon = parseFloat(entity.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
  }
  const pin = (entity?.pincode || '').trim();
  if (pin && PINCODE_COORDINATES[pin]) {
    return PINCODE_COORDINATES[pin];
  }
  return null;
};

/**
 * Calculate match score for a specific technician and booking
 */
export const calculateTechnicianMatchScore = (technician, booking, hasScheduleConflict = false) => {
  // 1. Specialization check
  if (Number(technician.service_id) !== Number(booking.service_id)) {
    return {
      matchScore: 0,
      breakdown: {
        category_match: false,
        location_score: 0,
        distance_km: null,
        availability_score: 0,
        rating_score: 0,
        experience_score: 0,
        fee_score: 0,
        total_score: 0,
      },
    };
  }

  // 2. Location & Service Coverage Area (Max 30 pts) with Haversine distance
  let locationScore = 0;
  const bookingCity = (booking.city || '').trim().toLowerCase();
  const techCity = (technician.city || '').trim().toLowerCase();
  const bookingPincode = (booking.pincode || '').trim();
  const techPincode = (technician.pincode || '').trim();
  const techArea = (technician.service_area || '').toLowerCase();
  const bookingAddress = (booking.service_address || '').toLowerCase();

  const isSameCity = bookingCity === techCity;
  const isSamePincode = Boolean(bookingPincode && techPincode && bookingPincode === techPincode);
  const isAreaMatch = Boolean(
    techArea && (
      techArea.includes(bookingCity) ||
      (bookingAddress && techArea.split(/[\s,/]+/).some((word) => word.length > 3 && bookingAddress.includes(word)))
    )
  );

  // Attempt Haversine distance calculation
  const bookingCoords = resolveCoordinates(booking);
  const techCoords = resolveCoordinates(technician);
  const distanceKm = calculateHaversineDistance(
    bookingCoords?.lat,
    bookingCoords?.lon,
    techCoords?.lat,
    techCoords?.lon
  );

  if (isSamePincode) {
    locationScore = 30;
  } else if (distanceKm !== null) {
    if (distanceKm <= 3.0) {
      locationScore = 30;
    } else if (distanceKm <= 7.0) {
      locationScore = 27;
    } else if (distanceKm <= 12.0) {
      locationScore = 24;
    } else if (distanceKm <= 20.0) {
      locationScore = 20;
    } else if (distanceKm <= 35.0) {
      locationScore = 15;
    } else {
      locationScore = 5;
    }
  } else if (isAreaMatch) {
    locationScore = 25;
  } else if (isSameCity) {
    locationScore = 20;
  } else {
    // Cross-city penalty
    locationScore = 0;
  }

  // 3. Availability (Max 20 pts)
  let availabilityScore = 0;
  if (hasScheduleConflict) {
    availabilityScore = 0; // Already booked on this date & time slot
  } else {
    switch (technician.availability_status) {
      case 'available':
        availabilityScore = 20;
        break;
      case 'busy':
        availabilityScore = 5;
        break;
      case 'offline':
      default:
        availabilityScore = 0;
        break;
    }
  }

  // 4. Rating & Reviews (Max 20 pts)
  let ratingScore = 0;
  const avgRating = parseFloat(technician.average_rating) || 0;
  if (avgRating > 0) {
    ratingScore = Math.min(20, Math.round((avgRating / 5.0) * 20 * 10) / 10);
  } else {
    // Fair baseline for newly registered verified technicians (equivalent to 3.5 / 5)
    ratingScore = 14;
  }

  // 5. Experience Years (Max 15 pts)
  let experienceScore = 0;
  const expYears = parseInt(technician.experience_years, 10) || 0;
  if (expYears >= 8) {
    experienceScore = 15;
  } else if (expYears >= 5) {
    experienceScore = 12;
  } else if (expYears >= 3) {
    experienceScore = 9;
  } else if (expYears >= 1) {
    experienceScore = 6;
  } else {
    experienceScore = 3;
  }

  // 6. Visiting Charges & Hourly Affordability (Max 15 pts)
  let feeScore = 15;
  const basePrice = parseFloat(booking.service_base_price || booking.estimated_cost) || 199.0;
  const visitingCharges = parseFloat(technician.visiting_charges) || 150.0;

  if (visitingCharges <= basePrice) {
    feeScore = 15;
  } else {
    // Deduct proportionally for higher visiting charges
    const priceDiff = visitingCharges - basePrice;
    const deduction = Math.round((priceDiff / basePrice) * 10);
    feeScore = Math.max(0, 15 - deduction);
  }

  // Total Score (0 - 100)
  const totalScore = Math.min(
    100,
    Math.round(locationScore + availabilityScore + ratingScore + experienceScore + feeScore)
  );

  const breakdown = {
    category_match: true,
    location_score: locationScore,
    distance_km: distanceKm, // actual distance in km or null
    availability_score: availabilityScore,
    rating_score: ratingScore,
    experience_score: experienceScore,
    fee_score: feeScore,
    total_score: totalScore,
  };

  return { matchScore: totalScore, breakdown };
};

/**
 * Check if a technician has conflicting accepted or in-progress bookings
 * on a given scheduled_date and scheduled_time_slot.
 */
export const checkScheduleConflict = async (technicianProfileId, scheduledDate, scheduledTimeSlot) => {
  const [rows] = await pool.query(
    `SELECT id FROM bookings 
     WHERE technician_id = ? 
       AND scheduled_date = ? 
       AND scheduled_time_slot = ? 
       AND booking_status IN ('accepted', 'in_progress')`,
    [technicianProfileId, scheduledDate, scheduledTimeSlot]
  );
  return rows.length > 0;
};

/**
 * Compute and rank all matching technicians for a booking.
 * Excludes technicians who previously rejected this booking.
 * Saves/updates entries in MySQL technician_recommendations.
 */
export const rankTechniciansForBooking = async (bookingId) => {
  // 1. Fetch booking details
  const [bookings] = await pool.query(
    `SELECT b.*, s.name AS service_name, s.base_price AS service_base_price 
     FROM bookings b 
     JOIN services s ON b.service_id = s.id 
     WHERE b.id = ?`,
    [bookingId]
  );

  if (bookings.length === 0) return [];
  const booking = bookings[0];

  // 2. Fetch all technicians specializing in this service category
  // Exclude technicians who have rejected this specific booking in service_status_logs
  const [technicians] = await pool.query(
    `SELECT tp.*, u.name AS technician_name, u.email, u.phone, u.status AS user_status,
            s.name AS service_name, s.icon AS service_icon
     FROM technician_profiles tp
     JOIN users u ON tp.user_id = u.id
     JOIN services s ON tp.service_id = s.id
     WHERE tp.service_id = ?
       AND u.status = 'active'
       AND tp.user_id NOT IN (
         SELECT changed_by_user_id 
         FROM service_status_logs 
         WHERE booking_id = ? AND status = 'rejected'
       )`,
    [booking.service_id, bookingId]
  );

  if (technicians.length === 0) return [];

  // 3. Evaluate each technician
  const ranked = [];
  for (const tech of technicians) {
    const hasConflict = await checkScheduleConflict(
      tech.id,
      booking.scheduled_date,
      booking.scheduled_time_slot
    );

    const { matchScore, breakdown } = calculateTechnicianMatchScore(tech, booking, hasConflict);

    // Only include technicians with non-zero location score (or acceptable match)
    if (matchScore > 0 && breakdown.location_score > 0) {
      ranked.push({
        technicianId: tech.id,
        userId: tech.user_id,
        technicianName: tech.technician_name,
        technicianPhone: tech.phone,
        serviceName: tech.service_name,
        serviceIcon: tech.service_icon,
        qualification: tech.qualification,
        experienceYears: tech.experience_years,
        hourlyRate: parseFloat(tech.hourly_rate),
        visitingCharges: parseFloat(tech.visiting_charges),
        averageRating: parseFloat(tech.average_rating) || 5.0,
        totalReviews: tech.total_reviews,
        availabilityStatus: tech.availability_status,
        serviceArea: tech.service_area,
        city: tech.city,
        pincode: tech.pincode,
        distanceKm: breakdown.distance_km,
        matchScore,
        breakdown,
        explanation:
          'Recommended because this technician matches your service, is nearby, available at the requested time, has relevant experience, and has a suitable fee.',
      });
    }
  }

  // 4. Sort descending by match score
  ranked.sort((a, b) => b.matchScore - a.matchScore);

  // 5. Store/update recommendations in technician_recommendations table
  for (let i = 0; i < ranked.length; i++) {
    const rec = ranked[i];
    const rankPosition = i + 1;
    rec.rankPosition = rankPosition;

    // Check if recommendation row exists
    const [existing] = await pool.query(
      `SELECT id FROM technician_recommendations WHERE booking_id = ? AND technician_id = ?`,
      [bookingId, rec.technicianId]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE technician_recommendations 
         SET match_score = ?, rank_position = ?, score_breakdown = ? 
         WHERE id = ?`,
        [rec.matchScore, rankPosition, JSON.stringify(rec.breakdown), existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO technician_recommendations (booking_id, technician_id, match_score, rank_position, score_breakdown)
         VALUES (?, ?, ?, ?, ?)`,
        [bookingId, rec.technicianId, rec.matchScore, rankPosition, JSON.stringify(rec.breakdown)]
      );
    }
  }

  return ranked;
};

/**
 * Fetch recommendations for a booking (for customer UI).
 * Returns ranked technicians with full profile and score breakdowns.
 */
export const getBookingRecommendations = async (bookingId) => {
  // Check if recommendations already exist
  const [existing] = await pool.query(
    `SELECT tr.*, 
            tp.user_id, tp.qualification, tp.experience_years, tp.hourly_rate, 
            tp.visiting_charges, tp.service_area, tp.city, tp.pincode, 
            tp.average_rating, tp.total_reviews, tp.availability_status, tp.bio,
            u.name AS technician_name, u.phone AS technician_phone,
            s.name AS service_name, s.icon AS service_icon
     FROM technician_recommendations tr
     JOIN technician_profiles tp ON tr.technician_id = tp.id
     JOIN users u ON tp.user_id = u.id
     JOIN services s ON tp.service_id = s.id
     WHERE tr.booking_id = ?
     ORDER BY tr.rank_position ASC`,
    [bookingId]
  );

  // Query any rejections recorded for this booking
  const [rejectLogs] = await pool.query(
    `SELECT changed_by_user_id 
     FROM service_status_logs 
     WHERE booking_id = ? AND status IN ('rejected', 'technician_rejected')`,
    [bookingId]
  );
  const rejectedUserIds = new Set(rejectLogs.map((l) => l.changed_by_user_id));

  if (existing.length > 0) {
    return existing.map((row) => {
      const breakdown = typeof row.score_breakdown === 'string'
        ? JSON.parse(row.score_breakdown)
        : (row.score_breakdown || {});

      return {
        technicianId: row.technician_id,
        userId: row.user_id,
        technicianName: row.technician_name,
        technicianPhone: row.technician_phone,
        serviceName: row.service_name,
        serviceIcon: row.service_icon,
        qualification: row.qualification,
        experienceYears: row.experience_years,
        hourlyRate: parseFloat(row.hourly_rate),
        visitingCharges: parseFloat(row.visiting_charges),
        averageRating: parseFloat(row.average_rating) || 5.0,
        totalReviews: row.total_reviews,
        availabilityStatus: row.availability_status,
        serviceArea: row.service_area,
        city: row.city,
        pincode: row.pincode,
        distanceKm: breakdown.distance_km != null ? breakdown.distance_km : null,
        matchScore: parseFloat(row.match_score),
        rankPosition: row.rank_position,
        wasSelected: Boolean(row.was_selected),
        isRejected: rejectedUserIds.has(row.user_id),
        breakdown,
        explanation:
          'Recommended because this technician matches your service, is nearby, available at the requested time, has relevant experience, and has a suitable fee.',
      };
    });
  }

  // If no recommendations recorded yet, compute them now
  return rankTechniciansForBooking(bookingId);
};

/**
 * Fetch recommended pending service requests for a specific logged-in technician
 */
export const getTechnicianServiceRequests = async (technicianUserId) => {
  // 1. Get technician profile
  const [profiles] = await pool.query(
    `SELECT tp.*, s.name AS service_name, u.name AS user_name, u.phone AS user_phone
     FROM technician_profiles tp
     JOIN services s ON tp.service_id = s.id
     JOIN users u ON tp.user_id = u.id
     WHERE tp.user_id = ?`,
    [technicianUserId]
  );

  if (profiles.length === 0) {
    throw new Error('Technician profile not found');
  }

  const techProfile = profiles[0];

  // 2. Fetch customer bookings for this service category that are either:
  //    a) customer_selected_technician and directed to this technician (techProfile.id)
  //    b) pending without an assigned technician
  // Exclude bookings where this technician has previously rejected
  const [pendingBookings] = await pool.query(
    `SELECT 
      b.*, 
      s.name AS service_name, 
      s.icon AS service_icon, 
      s.base_price AS service_base_price,
      u_cust.name AS customer_name, 
      u_cust.phone AS customer_phone, 
      u_cust.email AS customer_email
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     JOIN users u_cust ON b.user_id = u_cust.id
     WHERE b.service_id = ?
       AND (
         (b.booking_status = 'customer_selected_technician' AND b.technician_id = ?)
         OR (b.booking_status = 'pending' AND (b.technician_id IS NULL OR b.technician_id = ?))
       )
       AND b.id NOT IN (
         SELECT booking_id 
         FROM service_status_logs 
         WHERE changed_by_user_id = ? AND status IN ('rejected', 'technician_rejected')
       )
     ORDER BY b.scheduled_date ASC, b.created_at DESC`,
    [techProfile.service_id, techProfile.id, techProfile.id, technicianUserId]
  );

  // 3. For each pending booking, evaluate recommendation match score
  const results = [];
  for (const booking of pendingBookings) {
    const hasConflict = await checkScheduleConflict(
      techProfile.id,
      booking.scheduled_date,
      booking.scheduled_time_slot
    );

    const { matchScore, breakdown } = calculateTechnicianMatchScore(
      techProfile,
      booking,
      hasConflict
    );

    // Compute rank position among all technicians for this booking
    const rankedAll = await rankTechniciansForBooking(booking.id);
    const techRankEntry = rankedAll.find((r) => r.technicianId === techProfile.id);
    const rankPosition = techRankEntry ? techRankEntry.rankPosition : 1;

    // Filter out requests if location match is 0 (outside service area/city)
    if (breakdown.location_score > 0) {
      results.push({
        ...booking,
        recommendation: {
          match_score: matchScore,
          rank_position: rankPosition,
          score_breakdown: breakdown,
          is_top_recommendation: rankPosition === 1,
        },
      });
    }
  }

  // Sort results by match_score descending, then scheduled_date
  results.sort((a, b) => b.recommendation.match_score - a.recommendation.match_score);

  return results;
};
