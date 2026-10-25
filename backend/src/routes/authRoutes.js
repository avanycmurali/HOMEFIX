import express from 'express';
import {
  registerUser,
  registerTechnician,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Registration routes
router.post('/register', registerUser);
router.post('/register-technician', registerTechnician);

// Login route for all roles (user, technician, admin)
router.post('/login', login);

// Password Reset workflow routes
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Authenticated current user profile
router.get('/me', verifyToken, getMe);

export default router;
