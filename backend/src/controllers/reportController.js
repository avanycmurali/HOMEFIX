import { pool } from '../config/db.js';

/**
 * Helper to validate YYYY-MM-DD date format
 */
const isValidDateFormat = (dateStr) => {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
};

/**
 * 1. ADMIN: Technician Work Report
 * GET /api/admin/reports/technician-work?date=YYYY-MM-DD
 * Shows completed technician jobs on the selected date with earnings and payouts.
 */
export const getAdminTechnicianWorkReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date parameter in YYYY-MM-DD format is required.',
      });
    }

    const cleanDate = date.trim();

    const [rows] = await pool.query(
      `SELECT 
         b.id AS booking_id,
         b.booking_reference,
         DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS service_date,
         b.completed_at,
         b.booking_status,
         b.estimated_cost,
         b.final_cost,
         CASE WHEN b.final_cost > 0 THEN b.final_cost WHEN p.amount > 0 THEN p.amount ELSE COALESCE(b.estimated_cost, 0.00) END AS service_amount,
         u_cust.id AS customer_id,
         u_cust.name AS customer_name,
         s.name AS service_name,
         COALESCE(s.name, b.detected_service, 'Home Service') AS service_performed,
         tp.id AS technician_profile_id,
         u_tech.id AS technician_user_id,
         COALESCE(u_tech.name, 'Unassigned Technician') AS technician_name,
         COALESCE(pay.technician_amount, 0.00) AS technician_payout,
         pay.payout_status,
         pay.payout_reference,
         p.payment_status
       FROM bookings b
       JOIN users u_cust ON b.user_id = u_cust.id
       LEFT JOIN services s ON b.service_id = s.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       LEFT JOIN payments p ON b.id = p.booking_id
       LEFT JOIN technician_payouts pay ON b.id = pay.booking_id
       WHERE b.booking_status = 'completed'
         AND (b.scheduled_date = ? OR DATE(b.completed_at) = ?)
       ORDER BY b.completed_at DESC, b.id DESC`,
      [cleanDate, cleanDate]
    );

    let totalCompleted = rows.length;
    let totalServiceAmount = 0;
    let totalTechnicianPayout = 0;

    const records = rows.map((r) => {
      const amount = parseFloat(r.service_amount) || 0;
      const payout = parseFloat(r.technician_payout) || 0;
      totalServiceAmount += amount;
      totalTechnicianPayout += payout;

      return {
        booking_id: r.booking_id,
        booking_code: r.booking_reference || `BK-${r.booking_id}`,
        technician_name: r.technician_name,
        technician_id: r.technician_profile_id ? `TECH-${r.technician_profile_id}` : 'N/A',
        technician_profile_id: r.technician_profile_id,
        customer_name: r.customer_name,
        service_performed: r.service_performed,
        service_date: r.service_date,
        completion_status: 'Completed',
        service_amount: amount.toFixed(2),
        technician_payout: payout.toFixed(2),
        payout_status: r.payout_status || 'N/A',
        payment_status: r.payment_status || 'pending',
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: cleanDate,
        summary: {
          total_completed_services: totalCompleted,
          total_service_amount: totalServiceAmount.toFixed(2),
          total_technician_payout: totalTechnicianPayout.toFixed(2),
        },
        records,
      },
    });
  } catch (error) {
    console.error('Error generating admin technician work report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate technician work report.',
      error: error.message,
    });
  }
};

/**
 * 2. ADMIN: Customer / User Activity Report
 * GET /api/admin/reports/customer-activity?date=YYYY-MM-DD
 * Shows all customer complaints and bookings activity on the selected date.
 */
export const getAdminCustomerActivityReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date parameter in YYYY-MM-DD format is required.',
      });
    }

    const cleanDate = date.trim();

    const [rows] = await pool.query(
      `SELECT 
         b.id AS booking_id,
         b.booking_reference,
         b.problem_title,
         b.problem_description,
         DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS service_date,
         b.scheduled_time_slot,
         b.booking_status,
         DATE_FORMAT(b.created_at, '%Y-%m-%d') AS booking_date,
         CASE WHEN b.final_cost > 0 THEN b.final_cost WHEN p.amount > 0 THEN p.amount ELSE COALESCE(b.estimated_cost, 0.00) END AS service_amount,
         u_cust.id AS customer_id,
         u_cust.name AS customer_name,
         u_cust.email AS customer_email,
         COALESCE(s.name, b.detected_service, 'Home Service') AS service_requested,
         tp.id AS technician_profile_id,
         COALESCE(u_tech.name, 'Unassigned') AS technician_name,
         COALESCE(p.payment_status, 'pending') AS payment_status
       FROM bookings b
       JOIN users u_cust ON b.user_id = u_cust.id
       LEFT JOIN services s ON b.service_id = s.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE (b.scheduled_date = ? OR DATE(b.created_at) = ?)
       ORDER BY b.created_at DESC, b.id DESC`,
      [cleanDate, cleanDate]
    );

    let totalBookings = rows.length;
    let totalAmount = 0;

    const records = rows.map((r) => {
      const amount = parseFloat(r.service_amount) || 0;
      totalAmount += amount;

      const complaintDescription = r.problem_description
        ? `${r.problem_title} - ${r.problem_description}`
        : r.problem_title || 'No description provided';

      return {
        customer_name: r.customer_name,
        customer_id: r.customer_id,
        booking_id: r.booking_id,
        booking_code: r.booking_reference || `BK-${r.booking_id}`,
        service_requested: r.service_requested,
        complaint_description: complaintDescription,
        assigned_technician: r.technician_name,
        service_date: r.service_date,
        booking_status: r.booking_status,
        payment_status: r.payment_status,
        amount: amount.toFixed(2),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: cleanDate,
        summary: {
          total_bookings: totalBookings,
          total_amount: totalAmount.toFixed(2),
        },
        records,
      },
    });
  } catch (error) {
    console.error('Error generating admin customer activity report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate customer activity report.',
      error: error.message,
    });
  }
};

/**
 * 3. TECHNICIAN: Own Work Report
 * GET /api/technician/reports/work?date=YYYY-MM-DD
 * Shows only the authenticated technician's jobs for the selected date.
 */
export const getTechnicianWorkReport = async (req, res) => {
  try {
    const technicianUserId = req.user.id;
    const { date } = req.query;

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date parameter in YYYY-MM-DD format is required.',
      });
    }

    const cleanDate = date.trim();

    // 1. Get technician profile ID
    const [techProfiles] = await pool.query(
      'SELECT id FROM technician_profiles WHERE user_id = ?',
      [technicianUserId]
    );

    if (techProfiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found for the authenticated user.',
      });
    }

    const techProfileId = techProfiles[0].id;

    // 2. Query bookings assigned to this technician for the selected date
    const [rows] = await pool.query(
      `SELECT 
         b.id AS booking_id,
         b.booking_reference,
         b.problem_title,
         b.problem_description,
         DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS service_date,
         b.booking_status,
         b.completed_at,
         CASE WHEN b.final_cost > 0 THEN b.final_cost WHEN p.amount > 0 THEN p.amount ELSE COALESCE(b.estimated_cost, 0.00) END AS service_amount,
         u_cust.name AS customer_name,
         COALESCE(s.name, b.detected_service, 'Home Service') AS service_performed,
         u_tech.name AS technician_name,
         COALESCE(pay.technician_amount, 0.00) AS technician_payout,
         pay.payout_status
       FROM bookings b
       JOIN users u_cust ON b.user_id = u_cust.id
       LEFT JOIN services s ON b.service_id = s.id
       JOIN technician_profiles tp ON b.technician_id = tp.id
       JOIN users u_tech ON tp.user_id = u_tech.id
       LEFT JOIN payments p ON b.id = p.booking_id
       LEFT JOIN technician_payouts pay ON b.id = pay.booking_id
       WHERE b.technician_id = ?
         AND (b.scheduled_date = ? OR DATE(b.completed_at) = ?)
       ORDER BY b.scheduled_date DESC, b.id DESC`,
      [techProfileId, cleanDate, cleanDate]
    );

    let totalCompleted = 0;
    let totalEarnings = 0;

    const records = rows.map((r) => {
      const amount = parseFloat(r.service_amount) || 0;
      const payout = parseFloat(r.technician_payout) || 0;
      const isCompleted = r.booking_status === 'completed';

      if (isCompleted) {
        totalCompleted += 1;
        totalEarnings += payout;
      }

      const complaintProblem = r.problem_description
        ? `${r.problem_title} - ${r.problem_description}`
        : r.problem_title || 'N/A';

      return {
        technician_name: r.technician_name,
        booking_id: r.booking_id,
        booking_code: r.booking_reference || `BK-${r.booking_id}`,
        customer_name: r.customer_name,
        service_performed: r.service_performed,
        customer_complaint: complaintProblem,
        service_date: r.service_date,
        booking_status: r.booking_status,
        service_amount: amount.toFixed(2),
        technician_payout: payout.toFixed(2),
        completion_status: isCompleted ? 'Completed' : (r.booking_status === 'in_progress' ? 'In Progress' : 'Pending'),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: cleanDate,
        summary: {
          total_jobs_completed: totalCompleted,
          total_earnings: totalEarnings.toFixed(2),
        },
        records,
      },
    });
  } catch (error) {
    console.error('Error generating technician work report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate technician work report.',
      error: error.message,
    });
  }
};

/**
 * 4. CUSTOMER / USER: Own Complaints & Bookings Report
 * GET /api/bookings/reports/customer?date=YYYY-MM-DD
 * Shows only the authenticated customer's complaints/bookings for the selected date.
 */
export const getCustomerComplaintsReport = async (req, res) => {
  try {
    const customerUserId = req.user.id;
    const { date } = req.query;

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date parameter in YYYY-MM-DD format is required.',
      });
    }

    const cleanDate = date.trim();

    const [rows] = await pool.query(
      `SELECT 
         b.id AS booking_id,
         b.booking_reference,
         b.problem_title,
         b.problem_description,
         b.problem_image_url,
         b.voice_complaint_url,
         b.voice_transcription,
         b.detected_service,
         b.detected_problem,
         DATE_FORMAT(b.created_at, '%Y-%m-%d') AS booking_date,
         DATE_FORMAT(b.scheduled_date, '%Y-%m-%d') AS scheduled_date,
         b.scheduled_time_slot,
         b.booking_status,
         CASE WHEN b.final_cost > 0 THEN b.final_cost WHEN p.amount > 0 THEN p.amount ELSE COALESCE(b.estimated_cost, 0.00) END AS service_amount,
         u_cust.name AS customer_name,
         COALESCE(s.name, b.detected_service, 'Home Service') AS service_requested,
         COALESCE(u_tech.name, 'Not Assigned') AS assigned_technician,
         COALESCE(p.payment_status, 'pending') AS payment_status
       FROM bookings b
       JOIN users u_cust ON b.user_id = u_cust.id
       LEFT JOIN services s ON b.service_id = s.id
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       LEFT JOIN users u_tech ON tp.user_id = u_tech.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.user_id = ?
         AND (b.scheduled_date = ? OR DATE(b.created_at) = ?)
       ORDER BY b.created_at DESC, b.id DESC`,
      [customerUserId, cleanDate, cleanDate]
    );

    let totalComplaints = rows.length;
    let completedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    const records = rows.map((r) => {
      const amount = parseFloat(r.service_amount) || 0;

      if (r.booking_status === 'completed') {
        completedCount += 1;
      } else if (['cancelled', 'rejected', 'technician_rejected'].includes(r.booking_status)) {
        cancelledCount += 1;
      } else {
        pendingCount += 1;
      }

      const complaintDescription = r.problem_description
        ? `${r.problem_title} - ${r.problem_description}`
        : r.problem_title || 'N/A';

      const detectedProblemService = r.detected_problem
        ? `${r.detected_problem}${r.detected_service ? ` (${r.detected_service})` : ''}`
        : (r.detected_service || null);

      return {
        customer_name: r.customer_name,
        booking_id: r.booking_id,
        booking_code: r.booking_reference || `BK-${r.booking_id}`,
        complaint_description: complaintDescription,
        uploaded_image_url: r.problem_image_url || null,
        voice_complaint_url: r.voice_complaint_url || null,
        voice_transcription: r.voice_transcription || null,
        detected_problem_service: detectedProblemService,
        service_requested: r.service_requested,
        assigned_technician: r.assigned_technician,
        booking_date: r.booking_date,
        scheduled_date: r.scheduled_date,
        scheduled_time_slot: r.scheduled_time_slot,
        booking_status: r.booking_status,
        payment_status: r.payment_status,
        amount: amount.toFixed(2),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: cleanDate,
        summary: {
          total_complaints: totalComplaints,
          completed_complaints: completedCount,
          pending_complaints: pendingCount,
          cancelled_complaints: cancelledCount,
        },
        records,
      },
    });
  } catch (error) {
    console.error('Error generating customer complaints report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate customer complaints report.',
      error: error.message,
    });
  }
};
