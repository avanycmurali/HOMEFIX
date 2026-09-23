import { pool } from '../config/db.js';
import {
  getTechnicianServiceRequests,
  rankTechniciansForBooking,
  getBookingRecommendations,
  PINCODE_COORDINATES,
} from '../services/recommendationEngine.js';

// Allowed urgency levels
const VALID_URGENCY = ['low', 'medium', 'high', 'emergency'];

/**
 * Generate a unique, readable booking reference
 * e.g., HF-20260913-9A4B
 */
const generateBookingReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HF-${dateStr}-${randomSuffix}`;
};

/**
 * Register a new complaint / service booking
 * POST /api/bookings
 */
export const createBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      service_id,
      problem_title,
      problem_description,
      service_address,
      city,
      pincode,
      scheduled_date,
      scheduled_time_slot,
      urgency_level = 'medium',
      latitude = null,
      longitude = null,
    } = req.body;

    const userId = req.user.id;

    // Basic Validations
    if (!service_id) {
      return res.status(400).json({ success: false, message: 'Please select a service category.' });
    }
    if (!problem_title || !problem_title.trim()) {
      return res.status(400).json({ success: false, message: 'Problem title is required.' });
    }
    if (!problem_description || !problem_description.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a description of the issue.' });
    }
    if (!service_address || !service_address.trim()) {
      return res.status(400).json({ success: false, message: 'Service address is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required.' });
    }
    if (!pincode || !pincode.trim()) {
      return res.status(400).json({ success: false, message: 'Postal pincode is required.' });
    }
    if (!scheduled_date) {
      return res.status(400).json({ success: false, message: 'Please select a scheduled service date.' });
    }
    if (!scheduled_time_slot) {
      return res.status(400).json({ success: false, message: 'Please choose a preferred time slot.' });
    }

    const urgency = VALID_URGENCY.includes(urgency_level?.toLowerCase())
      ? urgency_level.toLowerCase()
      : 'medium';

    // Verify service category and get base price
    const [services] = await connection.query(
      'SELECT id, name, base_price FROM services WHERE id = ? AND is_active = TRUE',
      [service_id]
    );

    if (services.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected service category does not exist.' });
    }

    const service = services[0];
    const estimatedCost = parseFloat(service.base_price) || 199.0;

    // Handle problem image upload if provided
    let problemImageUrl = null;
    if (req.file) {
      problemImageUrl = `/uploads/complaints/${req.file.filename}`;
    }

    // Generate unique reference
    let bookingReference = generateBookingReference();
    let isUnique = false;
    while (!isUnique) {
      const [existing] = await connection.query(
        'SELECT id FROM bookings WHERE booking_reference = ?',
        [bookingReference]
      );
      if (existing.length === 0) {
        isUnique = true;
      } else {
        bookingReference = generateBookingReference();
      }
    }

    await connection.beginTransaction();

    let parsedLat = latitude != null && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    let parsedLon = longitude != null && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;

    if (parsedLat === null && parsedLon === null) {
      const pin = (pincode || '').trim();
      if (PINCODE_COORDINATES[pin]) {
        parsedLat = PINCODE_COORDINATES[pin].lat;
        parsedLon = PINCODE_COORDINATES[pin].lon;
      }
    }

    // Insert into bookings table
    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (
        booking_reference, user_id, service_id, problem_title, problem_description,
        problem_image_url, service_address, city, pincode, latitude, longitude, scheduled_date,
        scheduled_time_slot, urgency_level, booking_status, estimated_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        bookingReference,
        userId,
        service_id,
        problem_title.trim(),
        problem_description.trim(),
        problemImageUrl,
        service_address.trim(),
        city.trim(),
        pincode.trim(),
        parsedLat,
        parsedLon,
        scheduled_date,
        scheduled_time_slot.trim(),
        urgency,
        estimatedCost,
      ]
    );

    const bookingId = bookingResult.insertId;

    // Record initial status in service_status_logs
    await connection.query(
      `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
       VALUES (?, ?, 'pending', 'Complaint registered and waiting for technician assignment.')`,
      [bookingId, userId]
    );

    await connection.commit();

    // Compute recommendation rankings for matching technicians
    let recommendations = [];
    try {
      recommendations = await rankTechniciansForBooking(bookingId);
    } catch (recErr) {
      console.error('Error ranking technicians for booking:', recErr);
    }

    // Fetch created record with service name
    const [createdRows] = await pool.query(
      `SELECT b.*, s.name AS service_name, s.icon AS service_icon 
       FROM bookings b 
       JOIN services s ON b.service_id = s.id 
       WHERE b.id = ?`,
      [bookingId]
    );

    const bookingData = createdRows[0];
    if (bookingData) {
      bookingData.recommendations = recommendations.slice(0, 3);
      bookingData.top_recommendation = recommendations.length > 0 ? recommendations[0] : null;
    }

    return res.status(201).json({
      success: true,
      message: 'Complaint registered successfully! Service booking is confirmed.',
      booking: bookingData,
      recommendations: recommendations.slice(0, 3),
      top_recommendation: recommendations.length > 0 ? recommendations[0] : null,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register service complaint.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Get all complaints / bookings for the currently authenticated customer
 * GET /api/bookings/my-bookings
 */
export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
        b.*, 
        s.name AS service_name, 
        s.icon AS service_icon,
        s.base_price AS service_base_price,
        u_tech.name AS technician_name,
        u_tech.phone AS technician_phone,
        tp.average_rating AS technician_rating,
        tp.visiting_charges AS technician_visiting_charges,
        tp.experience_years AS technician_experience_years
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    // For unassigned, customer_selected_technician, or technician_rejected bookings, attach recommendation info
    for (const b of rows) {
      if (['pending', 'customer_selected_technician', 'technician_rejected', 'technician_assigned'].includes(b.booking_status)) {
        try {
          const recs = await getBookingRecommendations(b.id);
          b.recommendations = recs.slice(0, 3);
          b.top_recommendation = recs.length > 0 ? recs[0] : null;

          if (b.booking_status === 'customer_selected_technician' && b.technician_id) {
            const matchedRec = recs.find((r) => r.technicianId === b.technician_id);
            if (matchedRec) {
              b.selected_technician = matchedRec;
            } else {
              b.selected_technician = {
                technicianId: b.technician_id,
                technicianName: b.technician_name,
                technicianPhone: b.technician_phone,
                averageRating: b.technician_rating,
                visitingCharges: b.technician_visiting_charges,
                experienceYears: b.technician_experience_years,
              };
            }
          }

          if (b.booking_status === 'technician_rejected' && !b.rejection_reason) {
            const [lastRejectLog] = await pool.query(
              `SELECT remarks FROM service_status_logs 
               WHERE booking_id = ? AND status IN ('rejected', 'technician_rejected')
               ORDER BY logged_at DESC LIMIT 1`,
              [b.id]
            );
            if (lastRejectLog.length > 0) {
              b.rejection_reason = lastRejectLog[0].remarks.replace(/^Declined by technician:\s*/i, '');
            }
          }
        } catch (e) {
          b.recommendations = [];
          b.top_recommendation = null;
        }
      }
    }

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your bookings.',
      error: error.message,
    });
  }
};

/**
 * Get booking details by ID including status history logs
 * GET /api/bookings/:id
 */
export const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const [bookings] = await pool.query(
      `SELECT 
        b.*, 
        s.name AS service_name, 
        s.icon AS service_icon,
        u_cust.name AS customer_name,
        u_cust.email AS customer_email,
        u_cust.phone AS customer_phone,
        u_tech.name AS technician_name,
        u_tech.phone AS technician_phone,
        tp.average_rating AS technician_rating,
        tp.service_area AS technician_area
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u_cust ON b.user_id = u_cust.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // Access control: User can only view their own booking, technician assigned can view, admin can view all
    if (
      currentUserRole === 'user' &&
      booking.user_id !== currentUserId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own bookings.',
      });
    }

    // Fetch status change audit logs
    const [logs] = await pool.query(
      `SELECT slog.*, u.name AS changed_by_name, u.role AS changed_by_role
       FROM service_status_logs slog
       JOIN users u ON slog.changed_by_user_id = u.id
       WHERE slog.booking_id = ?
       ORDER BY slog.logged_at ASC`,
      [bookingId]
    );

    // Fetch recommendations for this booking
    let recommendations = [];
    try {
      recommendations = await getBookingRecommendations(bookingId);
    } catch (recErr) {
      console.error('Error fetching recommendations in getBookingById:', recErr);
    }

    const topRecommendation = recommendations.length > 0 ? recommendations[0] : null;
    booking.recommendations = recommendations.slice(0, 3);
    booking.top_recommendation = topRecommendation;

    if (booking.booking_status === 'customer_selected_technician' && booking.technician_id) {
      const match = recommendations.find((r) => r.technicianId === booking.technician_id);
      if (match) {
        booking.selected_technician = match;
      }
    }

    if (booking.booking_status === 'technician_rejected' && !booking.rejection_reason) {
      const [lastRejectLog] = await pool.query(
        `SELECT remarks FROM service_status_logs 
         WHERE booking_id = ? AND status IN ('rejected', 'technician_rejected')
         ORDER BY logged_at DESC LIMIT 1`,
        [bookingId]
      );
      if (lastRejectLog.length > 0) {
        booking.rejection_reason = lastRejectLog[0].remarks.replace(/^Declined by technician:\s*/i, '');
      }
    }

    return res.status(200).json({
      success: true,
      booking,
      statusHistory: logs,
      recommendations: recommendations.slice(0, 3),
      allRecommendations: recommendations,
      top_recommendation: topRecommendation,
      selected_technician: booking.selected_technician || null,
    });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking details.',
      error: error.message,
    });
  }
};

/**
 * Cancel a booking
 * PUT /api/bookings/:id/cancel
 */
export const cancelBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.id;
    const { reason = 'Cancelled by customer' } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const [bookings] = await connection.query(
      'SELECT id, user_id, booking_status FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // Only owner or admin can cancel
    if (currentUserRole === 'user' && booking.user_id !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings.' });
    }

    // Cancellation is allowed if pending or technician_assigned
    if (!['pending', 'technician_assigned'].includes(booking.booking_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is already '${booking.booking_status}'. Please contact customer support.`,
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE bookings 
       SET booking_status = 'cancelled', cancellation_reason = ? 
       WHERE id = ?`,
      [reason.trim(), bookingId]
    );

    await connection.query(
      `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
       VALUES (?, ?, 'cancelled', ?)`,
      [bookingId, currentUserId, `Cancelled: ${reason.trim()}`]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Booking has been cancelled successfully.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelling booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel booking.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Get all bookings across the platform (Admin oversight)
 * GET /api/bookings
 */
export const getAllBookings = async (req, res) => {
  try {
    const { status, service_id, city } = req.query;

    let query = `
      SELECT 
        b.*, 
        s.name AS service_name, 
        s.icon AS service_icon,
        u_cust.name AS customer_name,
        u_cust.phone AS customer_phone,
        u_tech.name AS technician_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u_cust ON b.user_id = u_cust.id
      LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
      LEFT JOIN users u_tech ON tp.user_id = u_tech.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.booking_status = ?';
      params.push(status);
    }
    if (service_id) {
      query += ' AND b.service_id = ?';
      params.push(service_id);
    }
    if (city) {
      query += ' AND b.city = ?';
      params.push(city);
    }

    query += ' ORDER BY b.created_at DESC';

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings list.',
      error: error.message,
    });
  }
};

/**
 * Get bookings for Technician (Assigned or Available in their trade/city)
 * GET /api/bookings/technician
 */
export const getTechnicianBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve technician profile
    const [profiles] = await pool.query(
      'SELECT id, service_id, city FROM technician_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const techProfile = profiles[0];

    // Fetch jobs assigned to this technician OR pending in their service category & city
    const [rows] = await pool.query(
      `SELECT 
        b.*, 
        s.name AS service_name, 
        s.icon AS service_icon,
        u_cust.name AS customer_name,
        u_cust.phone AS customer_phone,
        u_cust.email AS customer_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u_cust ON b.user_id = u_cust.id
       WHERE b.technician_id = ? 
          OR (b.technician_id IS NULL AND b.service_id = ? AND b.booking_status = 'pending')
       ORDER BY b.scheduled_date ASC, b.created_at DESC`,
      [techProfile.id, techProfile.service_id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching technician bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve service jobs.',
      error: error.message,
    });
  }
};

/**
 * Fetch pending recommended customer service requests for logged-in technician
 * GET /api/bookings/technician/requests
 */
export const getTechnicianRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await getTechnicianServiceRequests(userId);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching technician service requests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve technician service requests.',
    });
  }
};

/**
 * Fetch jobs assigned to and accepted by the logged-in technician
 * GET /api/bookings/technician/assigned
 */
export const getTechnicianAssignedJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    const [profiles] = await pool.query(
      'SELECT id FROM technician_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const techProfile = profiles[0];

    const [rows] = await pool.query(
      `SELECT 
        b.*, 
        s.name AS service_name, 
        s.icon AS service_icon,
        u_cust.name AS customer_name,
        u_cust.phone AS customer_phone,
        u_cust.email AS customer_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u_cust ON b.user_id = u_cust.id
       WHERE b.technician_id = ?
       ORDER BY b.scheduled_date ASC, b.created_at DESC`,
      [techProfile.id]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching assigned jobs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned service jobs.',
      error: error.message,
    });
  }
};

/**
 * Accept a pending service request (Technician only)
 * PUT /api/bookings/:id/accept
 */
export const acceptBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    // 1. Get technician profile
    const [profiles] = await connection.query(
      'SELECT id, service_id FROM technician_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const techProfile = profiles[0];

    // 2. Fetch booking
    const [bookings] = await connection.query(
      'SELECT id, service_id, booking_status, technician_id, booking_reference FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // Check service category match
    if (booking.service_id !== techProfile.service_id) {
      return res.status(400).json({
        success: false,
        message: 'This service request does not match your specialization category.',
      });
    }

    // Must be in pending or customer_selected_technician status
    if (booking.booking_status !== 'pending' && booking.booking_status !== 'customer_selected_technician') {
      return res.status(400).json({
        success: false,
        message: `This service request is already '${booking.booking_status}' and cannot be accepted.`,
      });
    }

    // If customer selected a technician, ensure this technician is that selected technician
    if (booking.booking_status === 'customer_selected_technician' && booking.technician_id && booking.technician_id !== techProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'This service request was directed to another technician.',
      });
    }

    await connection.beginTransaction();

    // Concurrency-safe atomic update
    const [updateResult] = await connection.query(
      `UPDATE bookings 
       SET technician_id = ?, booking_status = 'accepted', rejection_reason = NULL 
       WHERE id = ? AND (
         booking_status = 'pending' 
         OR (booking_status = 'customer_selected_technician' AND (technician_id = ? OR technician_id IS NULL))
       )`,
      [techProfile.id, bookingId, techProfile.id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'This service request was just accepted by another technician or is no longer available.',
      });
    }

    // Insert into service_status_logs
    await connection.query(
      `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
       VALUES (?, ?, 'accepted', 'Technician accepted the service request and will attend the appointment.')`,
      [bookingId, userId]
    );

    // Update technician_recommendations was_selected = TRUE
    await connection.query(
      `UPDATE technician_recommendations 
       SET was_selected = TRUE 
       WHERE booking_id = ? AND technician_id = ?`,
      [bookingId, techProfile.id]
    );

    await connection.commit();

    // Fetch updated booking with service and customer details
    const [updatedRows] = await pool.query(
      `SELECT 
        b.*, 
        s.name AS service_name, 
        s.icon AS service_icon,
        u_cust.name AS customer_name,
        u_cust.phone AS customer_phone,
        u_cust.email AS customer_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u_cust ON b.user_id = u_cust.id
       WHERE b.id = ?`,
      [bookingId]
    );

    return res.status(200).json({
      success: true,
      message: `Service request ${booking.booking_reference} accepted successfully!`,
      booking: updatedRows[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error accepting booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept service request.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Reject a pending service request (Technician only)
 * PUT /api/bookings/:id/reject
 */
export const rejectBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const reason = (req.body.reason || 'Schedule conflict').trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for declining the request.',
      });
    }

    // 1. Get technician profile
    const [profiles] = await connection.query(
      'SELECT id, service_id FROM technician_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const techProfile = profiles[0];

    // 2. Fetch booking
    const [bookings] = await connection.query(
      'SELECT id, service_id, booking_status, technician_id, booking_reference FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    if (booking.booking_status !== 'pending' && booking.booking_status !== 'customer_selected_technician') {
      return res.status(400).json({
        success: false,
        message: `Cannot decline a booking that is '${booking.booking_status}'.`,
      });
    }

    // If customer selected a specific technician, verify this technician is that assigned technician
    if (booking.booking_status === 'customer_selected_technician' && booking.technician_id && booking.technician_id !== techProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot decline a request directed to another technician.',
      });
    }

    const isCustomerSelected = booking.booking_status === 'customer_selected_technician';
    const newBookingStatus = isCustomerSelected ? 'technician_rejected' : 'pending';
    const logStatus = isCustomerSelected ? 'technician_rejected' : 'rejected';

    await connection.beginTransaction();

    // Check if already rejected by this technician to prevent duplicate logs
    const [existingLogs] = await connection.query(
      `SELECT id FROM service_status_logs 
       WHERE booking_id = ? AND changed_by_user_id = ? AND status IN ('rejected', 'technician_rejected')`,
      [bookingId, userId]
    );

    if (existingLogs.length === 0) {
      await connection.query(
        `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
         VALUES (?, ?, ?, ?)`,
        [bookingId, userId, logStatus, `Declined by technician: ${reason}`]
      );
    }

    // Update booking: reset technician_id to NULL, set status and rejection_reason
    await connection.query(
      `UPDATE bookings 
       SET technician_id = NULL, booking_status = ?, rejection_reason = ? 
       WHERE id = ?`,
      [newBookingStatus, reason, bookingId]
    );

    // Reset was_selected for this technician in technician_recommendations
    await connection.query(
      `UPDATE technician_recommendations 
       SET was_selected = FALSE 
       WHERE booking_id = ? AND technician_id = ?`,
      [bookingId, techProfile.id]
    );

    await connection.commit();

    // Re-rank remaining technicians for this booking in background
    rankTechniciansForBooking(bookingId).catch((err) =>
      console.error('Error re-ranking technicians after rejection:', err)
    );

    return res.status(200).json({
      success: true,
      message: `Service request ${booking.booking_reference} has been declined.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error rejecting booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to decline service request.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Get recommended technicians for a specific booking (Customer-facing)
 * GET /api/bookings/:id/recommendations
 */
export const getBookingRecommendationsController = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const recommendations = await getBookingRecommendations(bookingId);

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations.slice(0, 3), // Top 3 recommendations in ranked order
      all: recommendations,
      top_recommendation: recommendations.length > 0 ? recommendations[0] : null,
    });
  } catch (error) {
    console.error('Error fetching booking recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendations for this booking.',
      error: error.message,
    });
  }
};

/**
 * Customer selects a recommended technician for their booking
 * PUT /api/bookings/:id/select-technician
 */
export const selectTechnician = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.id;
    const customerUserId = req.user.id;
    const { technician_id } = req.body;

    if (!technician_id) {
      return res.status(400).json({
        success: false,
        message: 'technician_id is required.',
      });
    }

    const techId = parseInt(technician_id, 10);
    if (isNaN(techId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician_id.',
      });
    }

    // 1. Fetch booking and verify ownership
    const [bookings] = await connection.query(
      'SELECT * FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // Only customer who owns the booking can select
    if (booking.user_id !== customerUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only select technicians for your own bookings.',
      });
    }

    // Booking must still be pending or technician_rejected
    if (!['pending', 'technician_rejected'].includes(booking.booking_status)) {
      if (booking.booking_status === 'customer_selected_technician') {
        return res.status(400).json({
          success: false,
          message: 'A technician has already been selected. Please wait for technician confirmation.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Cannot select a technician for a booking with status '${booking.booking_status}'.`,
      });
    }

    // 2. Check if technician exists in recommendations list for this booking
    const [recs] = await connection.query(
      `SELECT tr.*, tp.user_id AS tech_user_id, u.name AS tech_name, u.phone AS tech_phone,
              tp.average_rating, tp.visiting_charges, tp.experience_years
       FROM technician_recommendations tr
       JOIN technician_profiles tp ON tr.technician_id = tp.id
       JOIN users u ON tp.user_id = u.id
       WHERE tr.booking_id = ? AND tr.technician_id = ?`,
      [bookingId, techId]
    );

    if (recs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected technician is not in the recommendations list for this booking.',
      });
    }

    const selectedRec = recs[0];

    // 3. Verify the technician has not previously rejected this booking
    const [priorRejections] = await connection.query(
      `SELECT id FROM service_status_logs 
       WHERE booking_id = ? AND changed_by_user_id = ? AND status IN ('rejected', 'technician_rejected')`,
      [bookingId, selectedRec.tech_user_id]
    );

    if (priorRejections.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This technician previously declined this service request and cannot be selected again.',
      });
    }

    await connection.beginTransaction();

    // 4. Concurrency-safe atomic update
    const [updateResult] = await connection.query(
      `UPDATE bookings 
       SET technician_id = ?, booking_status = 'customer_selected_technician', rejection_reason = NULL 
       WHERE id = ? AND booking_status IN ('pending', 'technician_rejected')`,
      [techId, bookingId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'The booking status was modified concurrently. Please refresh and try again.',
      });
    }

    // 5. Update technician_recommendations: was_selected = TRUE for selected, FALSE for others
    await connection.query(
      `UPDATE technician_recommendations 
       SET was_selected = CASE WHEN technician_id = ? THEN TRUE ELSE FALSE END 
       WHERE booking_id = ?`,
      [techId, bookingId]
    );

    // 6. Log in service_status_logs
    await connection.query(
      `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
       VALUES (?, ?, 'customer_selected_technician', ?)`,
      [bookingId, customerUserId, `Customer selected technician ${selectedRec.tech_name}. Waiting for technician confirmation.`]
    );

    await connection.commit();

    // 7. Return updated booking and selected technician details
    const [updatedRows] = await pool.query(
      `SELECT b.*, s.name AS service_name, s.icon AS service_icon,
              u_tech.name AS technician_name, u_tech.phone AS technician_phone,
              tp.average_rating AS technician_rating, tp.visiting_charges AS technician_visiting_charges,
              tp.experience_years AS technician_experience_years
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       WHERE b.id = ?`,
      [bookingId]
    );

    const updatedBooking = updatedRows[0];
    const recList = await getBookingRecommendations(bookingId);
    updatedBooking.recommendations = recList.slice(0, 3);
    updatedBooking.top_recommendation = recList.length > 0 ? recList[0] : null;

    const matchedRec = recList.find((r) => r.technicianId === techId);
    const selectedTechData = matchedRec || {
      technicianId: selectedRec.technician_id,
      technicianName: selectedRec.tech_name,
      technicianPhone: selectedRec.tech_phone,
      averageRating: parseFloat(selectedRec.average_rating) || 5.0,
      visitingCharges: parseFloat(selectedRec.visiting_charges) || 150,
      experienceYears: selectedRec.experience_years,
      matchScore: parseFloat(selectedRec.match_score),
    };

    updatedBooking.selected_technician = selectedTechData;

    return res.status(200).json({
      success: true,
      message: `Technician ${selectedRec.tech_name} selected successfully! Waiting for technician confirmation.`,
      booking: updatedBooking,
      selected_technician: selectedTechData,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error selecting technician:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to select technician.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Start service on an accepted booking (Technician only)
 * PUT /api/bookings/:id/start
 */
export const startService = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    // 1. Get technician profile
    const [profiles] = await connection.query(
      'SELECT id, service_id FROM technician_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const techProfile = profiles[0];

    // 2. Fetch booking
    const [bookings] = await connection.query(
      'SELECT id, booking_reference, booking_status, technician_id FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // 3. Authorization: Only the assigned technician can start service
    if (booking.technician_id !== techProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to start this service. Only the assigned technician can start it.',
      });
    }

    // 4. Validate status transition
    if (booking.booking_status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Service is already in progress.',
      });
    }

    if (booking.booking_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This service has already been completed.',
      });
    }

    if (booking.booking_status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot start service. Booking status is '${booking.booking_status}', but must be 'accepted'.`,
      });
    }

    await connection.beginTransaction();

    // 5. Update booking status to in_progress
    const [updateResult] = await connection.query(
      `UPDATE bookings 
       SET booking_status = 'in_progress' 
       WHERE id = ? AND booking_status = 'accepted' AND technician_id = ?`,
      [bookingId, techProfile.id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'The booking status was modified concurrently. Please refresh and try again.',
      });
    }

    // 6. Record status transition in service_status_logs
    const startRemarks = (req.body.remarks || req.body.notes || 'Technician started the service. Work is now in progress.').trim();
    await connection.query(
      `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
       VALUES (?, ?, 'in_progress', ?)`,
      [bookingId, userId, startRemarks]
    );

    await connection.commit();

    // 7. Fetch updated booking
    const [updatedRows] = await pool.query(
      `SELECT b.*, s.name AS service_name, s.icon AS service_icon,
              u_cust.name AS customer_name, u_cust.phone AS customer_phone, u_cust.email AS customer_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u_cust ON b.user_id = u_cust.id
       WHERE b.id = ?`,
      [bookingId]
    );

    return res.status(200).json({
      success: true,
      message: `Service for booking ${booking.booking_reference} has started! Status is now In Progress.`,
      booking: updatedRows[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error starting service:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start service.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Mark service as completed on an in-progress booking (Technician only)
 * PUT /api/bookings/:id/complete
 */
export const completeService = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const { service_notes, notes, final_cost } = req.body;
    const notesText = (service_notes || notes || '').trim();

    // 1. Get technician profile
    const [profiles] = await connection.query(
      'SELECT id, service_id FROM technician_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const techProfile = profiles[0];

    // 2. Fetch booking
    const [bookings] = await connection.query(
      'SELECT id, booking_reference, booking_status, technician_id, estimated_cost FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // 3. Authorization: Only the assigned technician can complete service
    if (booking.technician_id !== techProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this service. Only the assigned technician can mark it as completed.',
      });
    }

    // 4. Validate status transition
    if (booking.booking_status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This service has already been marked as completed.',
      });
    }

    if (booking.booking_status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark service as completed before starting it. Please start the service first.',
      });
    }

    if (booking.booking_status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark service as completed. Booking status is '${booking.booking_status}', but must be 'in_progress'.`,
      });
    }

    const parsedFinalCost = final_cost !== undefined && !isNaN(parseFloat(final_cost))
      ? parseFloat(final_cost)
      : booking.estimated_cost;

    await connection.beginTransaction();

    // 5. Update booking status to completed, store service_notes, completed_at, and final_cost
    const [updateResult] = await connection.query(
      `UPDATE bookings 
       SET booking_status = 'completed', 
           service_notes = ?, 
           completed_at = NOW(), 
           final_cost = ?
       WHERE id = ? AND booking_status = 'in_progress' AND technician_id = ?`,
      [notesText || null, parsedFinalCost, bookingId, techProfile.id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'The booking status was modified concurrently. Please refresh and try again.',
      });
    }

    // 6. Record status transition in service_status_logs
    const completionRemarks = notesText
      ? `Service completed: ${notesText}`
      : 'Service marked completed by technician.';

    await connection.query(
      `INSERT INTO service_status_logs (booking_id, changed_by_user_id, status, remarks)
       VALUES (?, ?, 'completed', ?)`,
      [bookingId, userId, completionRemarks]
    );

    // 7. Increment technician's total_jobs_completed count
    await connection.query(
      `UPDATE technician_profiles 
       SET total_jobs_completed = total_jobs_completed + 1 
       WHERE id = ?`,
      [techProfile.id]
    );

    await connection.commit();

    // 8. Fetch updated booking
    const [updatedRows] = await pool.query(
      `SELECT b.*, s.name AS service_name, s.icon AS service_icon,
              u_cust.name AS customer_name, u_cust.phone AS customer_phone, u_cust.email AS customer_email
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users u_cust ON b.user_id = u_cust.id
       WHERE b.id = ?`,
      [bookingId]
    );

    return res.status(200).json({
      success: true,
      message: `Service for booking ${booking.booking_reference} marked as completed!`,
      booking: updatedRows[0],
      service_notes: notesText || null,
      completed_at: updatedRows[0]?.completed_at,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error completing service:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark service as completed.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

