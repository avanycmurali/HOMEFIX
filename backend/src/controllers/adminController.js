import { pool } from '../config/db.js';

/**
 * 1. Admin Dashboard Overview Statistics
 * GET /api/admin/dashboard-stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Customer count
    const [[{ totalCustomers }]] = await pool.query(
      "SELECT COUNT(*) AS totalCustomers FROM users WHERE role = 'user'"
    );

    // 2. Technician count (strictly count registered technicians with a profile)
    const [[{ totalTechnicians }]] = await pool.query(
      "SELECT COUNT(*) AS totalTechnicians FROM users u JOIN technician_profiles tp ON u.id = tp.user_id WHERE u.role = 'technician'"
    );

    // 3. Pending technician verifications
    const [[{ pendingVerifications }]] = await pool.query(
      "SELECT COUNT(*) AS pendingVerifications FROM technician_profiles WHERE verification_status = 'pending'"
    );

    // 4. Booking status breakdown
    const [bookingCounts] = await pool.query(`
      SELECT 
        COUNT(*) AS totalBookings,
        SUM(CASE WHEN booking_status = 'pending' THEN 1 ELSE 0 END) AS pendingBookings,
        SUM(CASE WHEN booking_status IN ('customer_selected_technician', 'accepted', 'in_progress') THEN 1 ELSE 0 END) AS activeBookings,
        SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) AS completedBookings,
        SUM(CASE WHEN booking_status IN ('cancelled', 'technician_rejected', 'rejected') THEN 1 ELSE 0 END) AS cancelledBookings
      FROM bookings
    `);

    // 5. Payment status & revenue breakdown
    const [paymentCounts] = await pool.query(`
      SELECT 
        COUNT(*) AS totalPayments,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paidPayments,
        SUM(CASE WHEN payment_status IN ('pending', 'created') THEN 1 ELSE 0 END) AS pendingPayments,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) AS totalRevenue
      FROM payments
    `);

    // 6. Recent bookings (last 5)
    const [recentBookings] = await pool.query(`
      SELECT 
        b.id, b.booking_reference, b.problem_title, b.booking_status, b.scheduled_date, b.created_at,
        u.name AS customer_name,
        s.name AS service_name,
        p.payment_status, p.amount AS payment_amount
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN services s ON b.service_id = s.id
      LEFT JOIN payments p ON b.id = p.booking_id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    // 7. Recent reviews (last 5)
    const [recentReviews] = await pool.query(`
      SELECT 
        r.id, r.rating, r.review_comment, r.created_at,
        u.name AS customer_name,
        tu.name AS technician_name,
        s.name AS service_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN technician_profiles tp ON r.technician_id = tp.id
      JOIN users tu ON tp.user_id = tu.id
      JOIN services s ON tp.service_id = s.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);

    const statsObj = {
      totalCustomers: Number(totalCustomers) || 0,
      totalTechnicians: Number(totalTechnicians) || 0,
      pendingVerifications: Number(pendingVerifications) || 0,
      totalBookings: Number(bookingCounts[0]?.totalBookings) || 0,
      pendingBookings: Number(bookingCounts[0]?.pendingBookings) || 0,
      activeBookings: Number(bookingCounts[0]?.activeBookings) || 0,
      completedBookings: Number(bookingCounts[0]?.completedBookings) || 0,
      cancelledBookings: Number(bookingCounts[0]?.cancelledBookings) || 0,
      totalPayments: Number(paymentCounts[0]?.totalPayments) || 0,
      paidPayments: Number(paymentCounts[0]?.paidPayments) || 0,
      pendingPayments: Number(paymentCounts[0]?.pendingPayments) || 0,
      totalRevenue: parseFloat(paymentCounts[0]?.totalRevenue || 0),
      customers: {
        total: Number(totalCustomers) || 0,
        active: Number(totalCustomers) || 0,
        inactive: 0,
      },
      technicians: {
        total: Number(totalTechnicians) || 0,
        pending_verification: Number(pendingVerifications) || 0,
        verified: Math.max(0, (Number(totalTechnicians) || 0) - (Number(pendingVerifications) || 0)),
        rejected: 0,
      },
      bookings: {
        total: Number(bookingCounts[0]?.totalBookings) || 0,
        pending: Number(bookingCounts[0]?.pendingBookings) || 0,
        accepted: Number(bookingCounts[0]?.activeBookings) || 0,
        in_progress: 0,
        completed: Number(bookingCounts[0]?.completedBookings) || 0,
        cancelled: Number(bookingCounts[0]?.cancelledBookings) || 0,
      },
      payments: {
        total_transactions: Number(paymentCounts[0]?.totalPayments) || 0,
        paid_transactions: Number(paymentCounts[0]?.paidPayments) || 0,
        pending_transactions: Number(paymentCounts[0]?.pendingPayments) || 0,
        total_revenue: parseFloat(paymentCounts[0]?.totalRevenue || 0),
        total_amount: parseFloat(paymentCounts[0]?.totalRevenue || 0),
        paid_count: Number(paymentCounts[0]?.paidPayments) || 0,
        pending_count: Number(paymentCounts[0]?.pendingPayments) || 0,
      },
    };

    return res.status(200).json({
      success: true,
      stats: statsObj,
      data: statsObj,
      recentBookings,
      recentReviews,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin dashboard stats.',
      error: error.message,
    });
  }
};

/**
 * 2. Customer Management: List All Customers
 * GET /api/admin/customers
 */
export const getAllCustomers = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.city, u.pincode, u.address, u.status, u.created_at,
        COUNT(b.id) AS total_bookings
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      WHERE u.role = 'user'
    `;
    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const [customers] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers,
      data: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customers list.',
      error: error.message,
    });
  }
};

/**
 * 2b. Customer Details & History
 * GET /api/admin/customers/:id
 */
export const getCustomerDetails = async (req, res) => {
  try {
    const customerId = req.params.id;

    // Fetch customer profile (strictly omit password)
    const [users] = await pool.query(
      `SELECT id, name, email, phone, city, pincode, address, status, profile_image, created_at, updated_at 
       FROM users WHERE id = ? AND role = 'user'`,
      [customerId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const customer = users[0];

    // Fetch bookings (service history)
    const [bookings] = await pool.query(
      `SELECT 
         b.id, b.booking_reference, b.problem_title, b.problem_description, b.booking_status, 
         b.scheduled_date, b.scheduled_time_slot, b.estimated_cost, b.final_cost, b.completed_at, b.created_at,
         s.name AS service_name,
         tu.name AS technician_name,
         p.payment_status, p.payment_method, p.amount AS paid_amount, p.paid_at
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       LEFT JOIN users tu ON b.technician_id = tu.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [customerId]
    );

    // Fetch payments history
    const [payments] = await pool.query(
      `SELECT 
         p.id, p.booking_id, p.amount, p.currency, p.payment_method, p.payment_status,
         p.razorpay_order_id, p.razorpay_payment_id, p.paid_at, p.created_at,
         b.booking_reference, s.name AS service_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN services s ON b.service_id = s.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [customerId]
    );

    return res.status(200).json({
      success: true,
      customer,
      total_bookings: bookings.length,
      bookings,
      payments,
      data: {
        customer,
        bookings,
        payments,
      },
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer details.',
      error: error.message,
    });
  }
};

/**
 * 2c. Update Customer Status (Activate / Deactivate / Suspend)
 * PUT /api/admin/customers/:id/status
 */
export const updateCustomerStatus = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { status, remarks } = req.body;
    const adminId = req.user.id;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: 'active', 'inactive', 'suspended'.",
      });
    }

    const [result] = await pool.query(
      "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND role = 'user'",
      [status, customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // Record in admin_logs
    await pool.query(
      `INSERT INTO admin_logs (admin_user_id, action_type, target_table, target_id, details) 
       VALUES (?, 'customer_status_updated', 'users', ?, ?)`,
      [adminId, customerId, JSON.stringify({ new_status: status, remarks: remarks || null })]
    );

    return res.status(200).json({
      success: true,
      message: `Customer account status updated to '${status}'.`,
    });
  } catch (error) {
    console.error('Error updating customer status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer status.',
      error: error.message,
    });
  }
};

/**
 * 3. Technician Management: List All Technicians
 * GET /api/admin/technicians
 */
export const getAllTechnicians = async (req, res) => {
  try {
    const { service_id, verification_status, status, search } = req.query;

    let query = `
      SELECT 
        u.id AS user_id, u.name, u.email, u.phone, u.city, u.pincode, u.status AS account_status, u.created_at AS user_created_at,
        tp.id AS profile_id, tp.service_id, s.name AS service_name, s.icon AS service_icon,
        tp.experience_years, tp.qualification, tp.hourly_rate, tp.visiting_charges, tp.service_area,
        tp.average_rating, tp.total_reviews, tp.total_jobs_completed, tp.availability_status,
        tp.verification_status, tp.verified_at, tp.bio
      FROM users u
      JOIN technician_profiles tp ON u.id = tp.user_id
      LEFT JOIN services s ON tp.service_id = s.id
      WHERE u.role = 'technician'
    `;
    const params = [];

    if (service_id) {
      query += ` AND tp.service_id = ?`;
      params.push(service_id);
    }

    if (verification_status) {
      query += ` AND tp.verification_status = ?`;
      params.push(verification_status);
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR tp.service_area LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY tp.created_at DESC`;

    const [technicians] = await pool.query(query, params);

    const mappedTechnicians = technicians.map((t) => ({ ...t, id: t.user_id }));
    return res.status(200).json({
      success: true,
      count: mappedTechnicians.length,
      technicians: mappedTechnicians,
      data: mappedTechnicians,
    });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve technicians list.',
      error: error.message,
    });
  }
};

/**
 * 3b. Approve or Reject Technician Verification
 * PUT /api/admin/technicians/:id/verify
 */
export const updateTechnicianVerification = async (req, res) => {
  try {
    const techId = req.params.id; // can match profile_id or user_id
    const { verification_status, remarks } = req.body;
    const adminId = req.user.id;

    if (!['verified', 'rejected', 'pending'].includes(verification_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status. Allowed values: 'verified', 'rejected', 'pending'.",
      });
    }

    const verifiedAt = verification_status === 'verified' ? new Date() : null;

    // Try finding by profile id first, else user_id
    const [updateResult] = await pool.query(
      `UPDATE technician_profiles 
       SET verification_status = ?, verified_at = ?, updated_at = NOW() 
       WHERE id = ? OR user_id = ?`,
      [verification_status, verifiedAt, techId, techId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found.',
      });
    }

    // Get the updated profile to record accurate target ID
    const [profiles] = await pool.query(
      'SELECT id, user_id FROM technician_profiles WHERE id = ? OR user_id = ?',
      [techId, techId]
    );
    const profileId = profiles[0]?.id;

    // Record in admin_logs
    await pool.query(
      `INSERT INTO admin_logs (admin_user_id, action_type, target_table, target_id, details) 
       VALUES (?, ?, 'technician_profiles', ?, ?)`,
      [
        adminId,
        `technician_${verification_status}`,
        profileId,
        JSON.stringify({ status: verification_status, remarks: remarks || null }),
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Technician verification status updated to '${verification_status}'.`,
    });
  } catch (error) {
    console.error('Error verifying technician:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update technician verification status.',
      error: error.message,
    });
  }
};

/**
 * 3c. Update Technician Account Status (Active/Inactive/Suspended)
 * PUT /api/admin/technicians/:id/status
 */
export const updateTechnicianStatus = async (req, res) => {
  try {
    const techId = req.params.id;
    const { status, remarks } = req.body;
    const adminId = req.user.id;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: 'active', 'inactive', 'suspended'.",
      });
    }

    // techId can match users.id or technician_profiles.id
    const [result] = await pool.query(
      `UPDATE users 
       SET status = ?, updated_at = NOW() 
       WHERE (id = ? OR id IN (SELECT user_id FROM technician_profiles WHERE id = ?)) 
         AND role = 'technician'`,
      [status, techId, techId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician user not found.',
      });
    }

    // Record in admin_logs
    await pool.query(
      `INSERT INTO admin_logs (admin_user_id, action_type, target_table, target_id, details) 
       VALUES (?, 'technician_status_updated', 'users', ?, ?)`,
      [adminId, techId, JSON.stringify({ new_status: status, remarks: remarks || null })]
    );

    return res.status(200).json({
      success: true,
      message: `Technician account status updated to '${status}'.`,
    });
  } catch (error) {
    console.error('Error updating technician account status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update technician account status.',
      error: error.message,
    });
  }
};

/**
 * 4. Booking Management: List All Bookings with Multi-Filtering
 * GET /api/admin/bookings
 */
export const getAllBookings = async (req, res) => {
  try {
    const { status, service_id, date, payment_status, search } = req.query;

    let query = `
      SELECT 
        b.id, b.booking_reference, b.problem_title, b.problem_description, b.problem_image_url,
        b.service_address, b.city, b.pincode, b.scheduled_date, b.scheduled_time_slot,
        b.urgency_level, b.booking_status, b.estimated_cost, b.final_cost, b.service_notes,
        b.completed_at, b.created_at,
        u.id AS customer_id, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
        s.id AS service_id, s.name AS service_name, s.icon AS service_icon,
        tu.id AS technician_user_id, tu.name AS technician_name, tu.phone AS technician_phone,
        p.id AS payment_id, p.amount AS paid_amount, p.currency AS payment_currency,
        p.payment_method, p.payment_status, p.razorpay_order_id, p.razorpay_payment_id, p.paid_at,
        r.rating AS customer_rating, r.review_comment
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN services s ON b.service_id = s.id
      LEFT JOIN users tu ON b.technician_id = tu.id
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND b.booking_status = ?`;
      params.push(status);
    }

    if (service_id) {
      query += ` AND b.service_id = ?`;
      params.push(service_id);
    }

    if (date) {
      query += ` AND b.scheduled_date = ?`;
      params.push(date);
    }

    if (payment_status) {
      if (payment_status === 'unpaid') {
        query += ` AND (p.payment_status IS NULL OR p.payment_status != 'paid')`;
      } else {
        query += ` AND p.payment_status = ?`;
        params.push(payment_status);
      }
    }

    if (search) {
      query += ` AND (b.booking_reference LIKE ? OR b.problem_title LIKE ? OR u.name LIKE ? OR tu.name LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY b.created_at DESC`;

    const [bookings] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings.',
      error: error.message,
    });
  }
};

/**
 * 5. Payment Management: Complete Payment Ledger
 * GET /api/admin/payments
 */
export const getAllPayments = async (req, res) => {
  try {
    const { status, method, search } = req.query;

    let query = `
      SELECT 
        p.id, p.booking_id, p.user_id, p.amount, p.currency, p.payment_method,
        p.payment_status, p.razorpay_order_id, p.razorpay_payment_id, p.paid_at, p.created_at,
        b.booking_reference, b.problem_title, b.booking_status,
        u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
        tu.name AS technician_name,
        s.name AS service_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON p.user_id = u.id
      JOIN services s ON b.service_id = s.id
      LEFT JOIN users tu ON b.technician_id = tu.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND p.payment_status = ?`;
      params.push(status);
    }

    if (method) {
      query += ` AND p.payment_method = ?`;
      params.push(method);
    }

    if (search) {
      query += ` AND (b.booking_reference LIKE ? OR u.name LIKE ? OR p.razorpay_order_id LIKE ? OR p.razorpay_payment_id LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY p.created_at DESC`;

    const [payments] = await pool.query(query, params);

    // Format payments and attach is_demo flag clearly
    const formattedPayments = payments.map((p) => ({
      ...p,
      is_demo:
        p.payment_method === 'demo' ||
        (p.razorpay_order_id && p.razorpay_order_id.startsWith('order_demo_')) ||
        (p.razorpay_payment_id && p.razorpay_payment_id.startsWith('pay_demo_')),
    }));

    return res.status(200).json({
      success: true,
      count: formattedPayments.length,
      payments: formattedPayments,
      data: formattedPayments,
    });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments ledger.',
      error: error.message,
    });
  }
};

/**
 * 6. Reviews & Ratings Oversight
 * GET /api/admin/reviews
 */
export const getAllReviews = async (req, res) => {
  try {
    const { rating, service_id } = req.query;

    let query = `
      SELECT 
        r.id, r.booking_id, r.user_id, r.technician_id, r.rating, r.review_comment, r.created_at,
        b.booking_reference, b.problem_title,
        u.name AS customer_name, u.email AS customer_email,
        tu.name AS technician_name,
        s.name AS service_name
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN users u ON r.user_id = u.id
      JOIN technician_profiles tp ON r.technician_id = tp.id
      JOIN users tu ON tp.user_id = tu.id
      JOIN services s ON tp.service_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (rating) {
      query += ` AND r.rating = ?`;
      params.push(rating);
    }

    if (service_id) {
      query += ` AND s.id = ?`;
      params.push(service_id);
    }

    query += ` ORDER BY r.created_at DESC`;

    const [reviews] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews.',
      error: error.message,
    });
  }
};

/**
 * 7. Admin Audit Logs
 * GET /api/admin/audit-logs
 */
export const getAdminAuditLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT 
        al.id, al.admin_user_id, al.action_type, al.action_type AS action,
        al.target_table, al.target_table AS target_type, al.target_id, al.details, al.created_at,
        u.name AS admin_name, u.email AS admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);

    // Parse JSON details safely
    const formattedLogs = logs.map((log) => {
      let parsedDetails = null;
      try {
        parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      } catch {
        parsedDetails = log.details;
      }
      return {
        ...log,
        details: parsedDetails,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedLogs.length,
      logs: formattedLogs,
      data: formattedLogs,
    });
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin audit logs.',
      error: error.message,
    });
  }
};

/**
 * 2d. Delete Customer Account
 * DELETE /api/admin/customers/:id
 */
export const deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const adminId = req.user.id;

    // Check if customer exists
    const [users] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [customerId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const customer = users[0];

    if (customer.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administrator accounts cannot be deleted.',
      });
    }

    if (customer.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Specified account is not a customer.',
      });
    }

    // Delete user (cascade deletes bookings, payments, reviews, reminders, etc.)
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'user'", [customerId]);

    // Record in admin_logs
    await pool.query(
      `INSERT INTO admin_logs (admin_user_id, action_type, target_table, target_id, details) 
       VALUES (?, 'customer_deleted', 'users', ?, ?)`,
      [
        adminId,
        customerId,
        JSON.stringify({
          deleted_name: customer.name,
          deleted_email: customer.email,
        }),
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Customer '${customer.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete customer account.',
      error: error.message,
    });
  }
};

/**
 * 3d. Delete Technician Account
 * DELETE /api/admin/technicians/:id
 */
export const deleteTechnician = async (req, res) => {
  try {
    const techId = req.params.id;
    const adminId = req.user.id;

    // techId can match users.id or technician_profiles.id
    const [techs] = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email, u.role, tp.id AS profile_id 
       FROM users u 
       LEFT JOIN technician_profiles tp ON u.id = tp.user_id 
       WHERE (u.id = ? OR tp.id = ?) AND u.role = 'technician'`,
      [techId, techId]
    );

    if (techs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found.',
      });
    }

    const tech = techs[0];

    // Delete user from users table (cascades to technician_profiles, payouts, etc.)
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'technician'", [tech.user_id]);

    // If an orphaned profile existed with no matching user, remove it
    if (tech.profile_id) {
      await pool.query("DELETE FROM technician_profiles WHERE id = ?", [tech.profile_id]);
    }

    // Record in admin_logs
    await pool.query(
      `INSERT INTO admin_logs (admin_user_id, action_type, target_table, target_id, details) 
       VALUES (?, 'technician_deleted', 'users', ?, ?)`,
      [
        adminId,
        tech.user_id,
        JSON.stringify({
          deleted_name: tech.name,
          deleted_email: tech.email,
        }),
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Technician '${tech.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting technician:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete technician.',
      error: error.message,
    });
  }
};

export default {
  getDashboardStats,
  getAllCustomers,
  getCustomerDetails,
  updateCustomerStatus,
  deleteCustomer,
  getAllTechnicians,
  updateTechnicianVerification,
  updateTechnicianStatus,
  deleteTechnician,
  getAllBookings,
  getAllPayments,
  getAllReviews,
  getAdminAuditLogs,
};

