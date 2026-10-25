import crypto from 'crypto';
import { pool } from '../config/db.js';

/**
 * Generate a demo payout reference string (DEMO-PAYOUT-YYYYMMDD-XXXX)
 */
export const generateDemoPayoutReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DEMO-PAYOUT-${dateStr}-${randomSuffix}`;
};

/**
 * Helper: Automatically creates/ensures an earnings record in technician_payouts
 * when a customer payment succeeds for a completed booking.
 * Idempotent: duplicate calls will not create duplicate payouts.
 */
export const createTechnicianPayoutForPayment = async (paymentId, bookingId) => {
  try {
    // 1. Fetch payment details
    const [payments] = await pool.query(
      'SELECT id, amount, payment_status FROM payments WHERE id = ?',
      [paymentId]
    );
    if (payments.length === 0 || payments[0].payment_status !== 'paid') {
      return null;
    }
    const payment = payments[0];

    // 2. Fetch booking and assigned technician user ID
    const [bookings] = await pool.query(
      `SELECT b.id, b.technician_id, b.booking_status, tp.user_id AS tech_user_id
       FROM bookings b
       LEFT JOIN technician_profiles tp ON b.technician_id = tp.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return null;
    }

    const booking = bookings[0];
    const techUserId = booking.tech_user_id;

    if (!techUserId) {
      // Booking has no technician assigned (e.g. cancelled/unassigned)
      return null;
    }

    // 3. Calculate platform fee and technician net earnings
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
    const grossAmount = parseFloat(payment.amount);
    const platformFee = Math.round((grossAmount * platformFeePercent / 100) * 100) / 100;
    const technicianAmount = Math.round((grossAmount - platformFee) * 100) / 100;

    // 4. Insert idempotently (payment_id has UNIQUE constraint)
    await pool.query(
      `INSERT IGNORE INTO technician_payouts
        (booking_id, technician_id, payment_id, gross_amount, platform_fee, technician_amount, payout_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [bookingId, techUserId, payment.id, grossAmount, platformFee, technicianAmount]
    );

    // 5. Fetch and return the payout record
    const [payouts] = await pool.query(
      'SELECT * FROM technician_payouts WHERE payment_id = ?',
      [payment.id]
    );

    return payouts[0] || null;
  } catch (error) {
    console.error('Error creating technician payout for payment:', error);
    // Don't crash payment verification if payout creation fails, but log error
    return null;
  }
};

/**
 * Technician: View their own earnings, summary metrics and payout history.
 * GET /api/technician/earnings
 */
export const getTechnicianEarnings = async (req, res) => {
  try {
    const technicianUserId = req.user.id;

    // 1. Calculate summary metrics
    const [statsRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(technician_amount), 0) AS total_earnings,
         COALESCE(SUM(CASE WHEN payout_status = 'pending' THEN technician_amount ELSE 0 END), 0) AS pending_payout,
         COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN technician_amount ELSE 0 END), 0) AS paid_out,
         COUNT(id) AS total_jobs_paid
       FROM technician_payouts
       WHERE technician_id = ?`,
      [technicianUserId]
    );

    const stats = statsRows[0] || {
      total_earnings: 0,
      pending_payout: 0,
      paid_out: 0,
      total_jobs_paid: 0,
    };

    // 2. Fetch earnings records list
    const [earnings] = await pool.query(
      `SELECT 
         p.id,
         p.booking_id,
         b.booking_reference,
         COALESCE(s.name, b.detected_service, 'Home Service') AS service_name,
         b.problem_title,
         p.gross_amount,
         p.platform_fee,
         p.technician_amount,
         p.payout_status,
         p.payout_reference,
         p.paid_at,
         p.created_at
       FROM technician_payouts p
       JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN services s ON b.service_id = s.id
       WHERE p.technician_id = ?
       ORDER BY p.created_at DESC`,
      [technicianUserId]
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total_earnings: parseFloat(stats.total_earnings).toFixed(2),
          pending_payout: parseFloat(stats.pending_payout).toFixed(2),
          paid_out: parseFloat(stats.paid_out).toFixed(2),
          total_jobs_paid: parseInt(stats.total_jobs_paid, 10),
        },
        earnings,
      },
    });
  } catch (error) {
    console.error('Error fetching technician earnings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings details.',
      error: error.message,
    });
  }
};

/**
 * Admin: View all technician payouts across the platform.
 * GET /api/admin/payouts
 */
export const getAdminPayouts = async (req, res) => {
  try {
    // 1. Overall stats
    const [statsRows] = await pool.query(`
      SELECT 
        COALESCE(SUM(gross_amount), 0) AS total_gross,
        COALESCE(SUM(platform_fee), 0) AS total_platform_fees,
        COALESCE(SUM(technician_amount), 0) AS total_technician_earnings,
        COALESCE(SUM(CASE WHEN payout_status = 'pending' THEN technician_amount ELSE 0 END), 0) AS total_pending_payout,
        COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN technician_amount ELSE 0 END), 0) AS total_paid_out,
        COUNT(id) AS total_payout_records
      FROM technician_payouts
    `);

    const stats = statsRows[0] || {};

    // 2. All payout records with technician details
    const [payouts] = await pool.query(`
      SELECT 
        p.id,
        p.booking_id,
        b.booking_reference,
        COALESCE(s.name, b.detected_service, 'Home Service') AS service_name,
        p.technician_id,
        u.name AS technician_name,
        u.email AS technician_email,
        u.phone AS technician_phone,
        p.gross_amount,
        p.platform_fee,
        p.technician_amount,
        p.payout_status,
        p.payout_reference,
        p.paid_at,
        p.created_at
      FROM technician_payouts p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON p.technician_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      ORDER BY p.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total_gross: parseFloat(stats.total_gross || 0).toFixed(2),
          total_platform_fees: parseFloat(stats.total_platform_fees || 0).toFixed(2),
          total_technician_earnings: parseFloat(stats.total_technician_earnings || 0).toFixed(2),
          total_pending_payout: parseFloat(stats.total_pending_payout || 0).toFixed(2),
          total_paid_out: parseFloat(stats.total_paid_out || 0).toFixed(2),
          total_payout_records: parseInt(stats.total_payout_records || 0, 10),
        },
        payouts,
      },
    });
  } catch (error) {
    console.error('Error fetching admin payouts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout records.',
      error: error.message,
    });
  }
};

/**
 * Admin: Mark a technician payout as paid (Demo Payout)
 * PUT /api/admin/payouts/:id/mark-paid
 */
export const markPayoutAsPaid = async (req, res) => {
  try {
    const payoutId = req.params.id;

    // 1. Fetch payout record
    const [payoutRows] = await pool.query(
      `SELECT p.*, u.name AS technician_name, b.booking_reference 
       FROM technician_payouts p
       JOIN users u ON p.technician_id = u.id
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.id = ?`,
      [payoutId]
    );

    if (payoutRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payout record not found.',
      });
    }

    const payout = payoutRows[0];

    // 2. Check if already marked as paid
    if (payout.payout_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: `Payout #${payout.id} has already been marked as paid (Reference: ${payout.payout_reference}).`,
        payout,
      });
    }

    // 3. Generate demo payout reference
    const payoutReference = req.body?.payout_reference || generateDemoPayoutReference();

    // 4. Update status to 'paid'
    await pool.query(
      `UPDATE technician_payouts
       SET payout_status = 'paid',
           payout_reference = ?,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [payoutReference, payoutId]
    );

    // 5. Fetch updated payout
    const [updatedRows] = await pool.query(
      `SELECT p.*, u.name AS technician_name, b.booking_reference 
       FROM technician_payouts p
       JOIN users u ON p.technician_id = u.id
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.id = ?`,
      [payoutId]
    );

    const updatedPayout = updatedRows[0];

    return res.status(200).json({
      success: true,
      message: `Demo payout of ₹${updatedPayout.technician_amount} marked as PAID for technician ${updatedPayout.technician_name}.`,
      is_demo: true,
      payout: updatedPayout,
    });
  } catch (error) {
    console.error('Error marking payout as paid:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payout status.',
      error: error.message,
    });
  }
};
