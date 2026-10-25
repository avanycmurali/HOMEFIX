import crypto from 'crypto';
import { pool } from '../config/db.js';
import {
  createRazorpayOrder,
  createDemoOrder,
  verifyRazorpayPaymentSignature,
  isDemoPaymentMode,
} from '../services/razorpayService.js';
import { createTechnicianPayoutForPayment } from './payoutController.js';

/**
 * Create a Payment Order for a completed booking
 * Supports both PAYMENT_MODE=demo and PAYMENT_MODE=razorpay
 * POST /api/bookings/:id/payment/order
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // 1. Authorization: Only the customer who owns the booking can pay
    if (currentUserRole !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can initiate payment for their service bookings.',
      });
    }

    // 2. Fetch booking
    const [bookings] = await pool.query(
      `SELECT id, booking_reference, user_id, booking_status, estimated_cost, final_cost, service_id 
       FROM bookings WHERE id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const booking = bookings[0];

    // 3. Ownership verification
    if (booking.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this booking. Only the customer who placed the booking can pay.',
      });
    }

    // 4. Booking must be in 'completed' status
    if (booking.booking_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot initiate payment. Service must be marked as 'completed' by the technician first (current status: '${booking.booking_status}').`,
      });
    }

    // 5. Check if booking is already paid in payments table
    const [existingPayments] = await pool.query(
      'SELECT id, payment_status, razorpay_order_id, razorpay_payment_id FROM payments WHERE booking_id = ?',
      [bookingId]
    );

    if (existingPayments.length > 0 && existingPayments[0].payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking has already been paid.',
      });
    }

    // 6. Calculate payable amount from database (never trust amount from frontend)
    const payableAmount = parseFloat(booking.final_cost || booking.estimated_cost || 0);
    if (payableAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payable amount for this booking.',
      });
    }

    // Amount in paise for payment processing (₹500 = 50000 paise)
    const amountInPaise = Math.round(payableAmount * 100);
    const receipt = `HOMEFIX_${booking.id}_${Date.now()}`;
    const demoMode = isDemoPaymentMode();

    // 7. Create Payment Order (Demo or Razorpay)
    let order;
    let paymentMethod = 'razorpay';

    if (demoMode) {
      order = await createDemoOrder({
        amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          booking_id: String(booking.id),
          booking_reference: booking.booking_reference,
          customer_id: String(currentUserId),
          mode: 'demo',
        },
      });
      paymentMethod = 'demo';
    } else {
      order = await createRazorpayOrder({
        amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          booking_id: String(booking.id),
          booking_reference: booking.booking_reference,
          customer_id: String(currentUserId),
        },
      });
    }

    // 8. Persist order in MySQL payments table
    if (existingPayments.length > 0) {
      await pool.query(
        `UPDATE payments 
         SET amount = ?, currency = 'INR', payment_method = ?, 
             payment_status = 'pending', razorpay_order_id = ?, updated_at = NOW() 
         WHERE booking_id = ?`,
        [payableAmount, paymentMethod, order.id, bookingId]
      );
    } else {
      await pool.query(
        `INSERT INTO payments 
         (booking_id, user_id, amount, currency, payment_method, payment_status, razorpay_order_id) 
         VALUES (?, ?, ?, 'INR', ?, 'pending', ?)`,
        [bookingId, currentUserId, payableAmount, paymentMethod, order.id]
      );
    }

    // 9. Return safe response (never expose secret)
    return res.status(200).json({
      success: true,
      payment_mode: demoMode ? 'demo' : 'razorpay',
      is_demo: demoMode,
      key_id: demoMode ? null : process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount, // in paise
      currency: 'INR',
      booking_id: booking.id,
      message: demoMode
        ? 'Demo payment order initialized. No real money is charged.'
        : 'Payment order created successfully.',
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order.',
      error: error.message,
    });
  }
};

/**
 * Verify Payment Signature & Complete Payment
 * POST /api/bookings/:id/payment/verify
 */
export const verifyPayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    let { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Role verification
    if (currentUserRole !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only the customer can verify payment for this booking.',
      });
    }

    // 2. Validate request payload
    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameter: razorpay_order_id.',
      });
    }

    // 3. Fetch booking
    const [bookings] = await pool.query(
      'SELECT id, user_id, booking_status FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const booking = bookings[0];

    // 4. Ownership verification
    if (booking.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to verify payment for this booking.',
      });
    }

    // 5. Fetch payment record
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE booking_id = ?',
      [bookingId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payment order found for this booking.',
      });
    }

    const payment = payments[0];

    // 6. Duplicate payment protection: If already paid, reject duplicate verification
    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been completed and verified for this booking.',
      });
    }

    // Ensure order ID matches the record in database
    if (payment.razorpay_order_id && payment.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'The submitted order ID does not match the payment order for this booking.',
      });
    }

    const isDemo =
      isDemoPaymentMode() ||
      payment.payment_method === 'demo' ||
      (razorpay_order_id && razorpay_order_id.startsWith('order_demo_'));

    // Handle demo identifiers if omitted in demo checkout
    if (isDemo) {
      if (!razorpay_payment_id) {
        razorpay_payment_id = `pay_demo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      }
      if (!razorpay_signature) {
        razorpay_signature = 'demo_verified_signature';
      }
    } else {
      if (!razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required payment verification parameters (payment_id, signature).',
        });
      }
    }

    // 7. Verify Signature
    const isValidSignature = verifyRazorpayPaymentSignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValidSignature) {
      // Mark as failed in database
      await pool.query(
        `UPDATE payments 
         SET payment_status = 'failed', updated_at = NOW() 
         WHERE booking_id = ?`,
        [bookingId]
      );

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature.',
      });
    }

    // 8. Update payment record to 'paid'
    const finalMethod = isDemo ? 'demo' : 'razorpay';
    await pool.query(
      `UPDATE payments 
       SET payment_status = 'paid', 
           payment_method = ?,
           razorpay_payment_id = ?, 
           razorpay_signature = ?, 
           paid_at = NOW(), 
           updated_at = NOW() 
       WHERE booking_id = ?`,
      [finalMethod, razorpay_payment_id, razorpay_signature, bookingId]
    );

    // 9. Fetch updated payment
    const [updatedRows] = await pool.query(
      'SELECT * FROM payments WHERE booking_id = ?',
      [bookingId]
    );

    const updatedPayment = updatedRows[0];

    // Trigger automated technician earnings / payout record creation
    await createTechnicianPayoutForPayment(updatedPayment.id, bookingId);

    return res.status(200).json({
      success: true,
      message: isDemo
        ? 'Demo payment completed successfully! No real money was charged.'
        : 'Payment verified and recorded successfully!',
      is_demo: isDemo,
      payment: {
        booking_id: booking.id,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency || 'INR',
        payment_method: updatedPayment.payment_method,
        payment_status: 'paid',
        razorpay_order_id: updatedPayment.razorpay_order_id,
        razorpay_payment_id: updatedPayment.razorpay_payment_id,
        paid_at: updatedPayment.paid_at,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment.',
      error: error.message,
    });
  }
};

/**
 * Get payment status for a specific booking
 * GET /api/bookings/:id/payment
 */
export const getBookingPayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // 1. Fetch booking
    const [bookings] = await pool.query(
      'SELECT id, user_id, booking_reference, booking_status FROM bookings WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const booking = bookings[0];

    // 2. Authorization: Only booking owner or admin can view payment details
    if (currentUserRole !== 'admin' && booking.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view payment details for this booking.',
      });
    }

    // 3. Fetch payment record
    const [payments] = await pool.query(
      `SELECT id, booking_id, user_id, amount, currency, payment_method, 
              payment_status, razorpay_order_id, razorpay_payment_id, paid_at, created_at, updated_at 
       FROM payments WHERE booking_id = ?`,
      [bookingId]
    );

    const currentMode = isDemoPaymentMode() ? 'demo' : 'razorpay';

    if (payments.length === 0) {
      return res.status(200).json({
        success: true,
        payment: null,
        payment_mode: currentMode,
        message: 'No payment record exists for this booking.',
      });
    }

    const payment = payments[0];

    return res.status(200).json({
      success: true,
      payment_mode: currentMode,
      payment: {
        id: payment.id,
        booking_id: payment.booking_id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        payment_method: payment.payment_method,
        payment_status: payment.payment_status,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        paid_at: payment.paid_at,
        created_at: payment.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching booking payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment information.',
      error: error.message,
    });
  }
};

export default {
  createPaymentOrder,
  verifyPayment,
  getBookingPayment,
};
