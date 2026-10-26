import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  getTechnicianBookings,
  getTechnicianRequests,
  getTechnicianAssignedJobs,
  acceptBooking,
  rejectBooking,
  getBookingRecommendationsController,
  selectTechnician,
  startService,
  completeService,
  getToolMaterialSuggestionsForBooking,
  submitBookingReview,
  getBookingReview,
  getVoiceRecordingStream,
} from '../controllers/bookingController.js';
import {
  createPaymentOrder,
  verifyPayment,
  getBookingPayment,
} from '../controllers/paymentController.js';
import { getTechnicianEarnings } from '../controllers/payoutController.js';
import { getCustomerComplaintsReport } from '../controllers/reportController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { uploadComplaintMedia } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Register a new service complaint (Customer only, supports file upload)
router.post(
  '/',
  verifyToken,
  authorizeRoles('user'),
  uploadComplaintMedia,
  createBooking
);

// Customer's personal bookings
router.get(
  '/my-bookings',
  verifyToken,
  authorizeRoles('user'),
  getMyBookings
);
router.get(
  '/my',
  verifyToken,
  authorizeRoles('user'),
  getMyBookings
);

// Customer's personal complaints report
router.get(
  '/reports/customer',
  verifyToken,
  authorizeRoles('user'),
  getCustomerComplaintsReport
);
router.get(
  '/reports',
  verifyToken,
  authorizeRoles('user'),
  getCustomerComplaintsReport
);

// Technician recommended service requests (pending)
router.get(
  '/technician/requests',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianRequests
);

// Technician assigned/accepted active jobs
router.get(
  '/technician/assigned',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianAssignedJobs
);

// Technician assigned / available jobs (general)
router.get(
  '/technician',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianBookings
);

// Technician earnings alias
router.get(
  '/technician/earnings',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianEarnings
);

// Admin oversight of all bookings
router.get(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  getAllBookings
);

// Recommended technicians for a booking (Customer-facing)
router.get(
  '/:id/recommendations',
  verifyToken,
  getBookingRecommendationsController
);

// Customer selects a recommended technician
router.put(
  '/:id/select-technician',
  verifyToken,
  authorizeRoles('user'),
  selectTechnician
);

// Individual booking details
router.get(
  '/:id',
  verifyToken,
  getBookingById
);

// Accept a booking (Technician only)
router.put(
  '/:id/accept',
  verifyToken,
  authorizeRoles('technician'),
  acceptBooking
);

// Reject a booking (Technician only)
router.put(
  '/:id/reject',
  verifyToken,
  authorizeRoles('technician'),
  rejectBooking
);

// Start service (Technician only)
router.put(
  '/:id/start',
  verifyToken,
  authorizeRoles('technician'),
  startService
);
router.put(
  '/:id/start-service',
  verifyToken,
  authorizeRoles('technician'),
  startService
);

// Complete service (Technician only)
router.put(
  '/:id/complete',
  verifyToken,
  authorizeRoles('technician'),
  completeService
);
router.put(
  '/:id/mark-completed',
  verifyToken,
  authorizeRoles('technician'),
  completeService
);
router.put(
  '/:id/complete-service',
  verifyToken,
  authorizeRoles('technician'),
  completeService
);

// Cancel a booking (Customer or Admin)
router.put(
  '/:id/cancel',
  verifyToken,
  cancelBooking
);

// Intelligent rule-based tool & material suggestions (Assigned Technician only)
router.get(
  '/:id/tool-material-suggestions',
  verifyToken,
  authorizeRoles('technician'),
  getToolMaterialSuggestionsForBooking
);

// =============================================================================
// MODULE: RAZORPAY TEST PAYMENT
// =============================================================================

// Create Razorpay payment order for completed booking (Customer only)
router.post(
  '/:id/payment/order',
  verifyToken,
  authorizeRoles('user'),
  createPaymentOrder
);

// Verify Razorpay payment signature (Customer only)
router.post(
  '/:id/payment/verify',
  verifyToken,
  authorizeRoles('user'),
  verifyPayment
);

// Get payment status for a booking (Customer or Admin)
router.get(
  '/:id/payment',
  verifyToken,
  getBookingPayment
);

// Submit review & rating for completed booking (Customer only)
router.post(
  '/:id/review',
  verifyToken,
  authorizeRoles('user'),
  submitBookingReview
);

// Get review for a booking
router.get(
  '/:id/review',
  verifyToken,
  getBookingReview
);

// Stream or download voice complaint recording (Security & Role checks enforced)
router.get(
  '/:id/voice-recording',
  verifyToken,
  getVoiceRecordingStream
);

export default router;
