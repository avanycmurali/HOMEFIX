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
} from '../controllers/bookingController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { uploadComplaintImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Register a new service complaint (Customer only, supports file upload)
router.post(
  '/',
  verifyToken,
  authorizeRoles('user'),
  uploadComplaintImage,
  createBooking
);

// Customer's personal bookings
router.get(
  '/my-bookings',
  verifyToken,
  authorizeRoles('user'),
  getMyBookings
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

export default router;
