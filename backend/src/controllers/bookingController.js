import { pool } from '../config/db.js';

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

    // Insert into bookings table
    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (
        booking_reference, user_id, service_id, problem_title, problem_description,
        problem_image_url, service_address, city, pincode, scheduled_date,
        scheduled_time_slot, urgency_level, booking_status, estimated_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
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

    // Fetch created record with service name
    const [createdRows] = await pool.query(
      `SELECT b.*, s.name AS service_name, s.icon AS service_icon 
       FROM bookings b 
       JOIN services s ON b.service_id = s.id 
       WHERE b.id = ?`,
      [bookingId]
    );

    return res.status(201).json({
      success: true,
      message: 'Complaint registered successfully! Service booking is confirmed.',
      booking: createdRows[0],
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
        tp.visiting_charges AS technician_visiting_charges
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

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

    return res.status(200).json({
      success: true,
      booking,
      statusHistory: logs,
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
