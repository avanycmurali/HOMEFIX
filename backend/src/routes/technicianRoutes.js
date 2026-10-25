import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getTechnicianEarnings } from '../controllers/payoutController.js';

const router = express.Router();

/**
 * Technician Earnings & Payout Status
 * GET /api/technician/earnings
 */
router.get(
  '/earnings',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianEarnings
);

export default router;
