import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getTechnicianEarnings } from '../controllers/payoutController.js';
import { getTechnicianWorkReport } from '../controllers/reportController.js';

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

/**
 * Technician Work Report for Selected Date
 * GET /api/technician/reports/work
 * GET /api/technician/reports
 */
router.get(
  '/reports/work',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianWorkReport
);

router.get(
  '/reports',
  verifyToken,
  authorizeRoles('technician'),
  getTechnicianWorkReport
);

export default router;
