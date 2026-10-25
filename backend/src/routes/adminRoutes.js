import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
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
} from '../controllers/adminController.js';
import {
  getAdminPayouts,
  markPayoutAsPaid,
} from '../controllers/payoutController.js';

const router = express.Router();

// Strict security: All admin routes require valid JWT and 'admin' role
router.use(verifyToken, authorizeRoles('admin'));

// 1. Dashboard Overview Stats
router.get('/dashboard-stats', getDashboardStats);

// 2. Customer Management
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerDetails);
router.put('/customers/:id/status', updateCustomerStatus);
router.delete('/customers/:id', deleteCustomer);

// 3. Technician Management
router.get('/technicians', getAllTechnicians);
router.put('/technicians/:id/verify', updateTechnicianVerification);
router.put('/technicians/:id/status', updateTechnicianStatus);
router.delete('/technicians/:id', deleteTechnician);

// 4. Booking Oversight
router.get('/bookings', getAllBookings);

// 5. Payment Oversight
router.get('/payments', getAllPayments);

// 6. Reviews & Ratings
router.get('/reviews', getAllReviews);

// 7. Audit Logs
router.get('/audit-logs', getAdminAuditLogs);

// 8. Technician Payouts Management
router.get('/payouts', getAdminPayouts);
router.put('/payouts/:id/mark-paid', markPayoutAsPaid);
router.put('/payouts/:id/pay', markPayoutAsPaid);

export default router;
