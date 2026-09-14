import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  getTechnicianBookings,
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

// Technician assigned / available jobs
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

// Individual booking details
router.get(
  '/:id',
  verifyToken,
  getBookingById
);

// Cancel a booking (Customer or Admin)
router.put(
  '/:id/cancel',
  verifyToken,
  cancelBooking
);

export default router;
