import express from 'express';
import {
  registerUser,
  registerTechnician,
  login,
  getMe,
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Registration routes
router.post('/register', registerUser);
router.post('/register-technician', registerTechnician);

// Login route for all roles (user, technician, admin)
router.post('/login', login);

// Authenticated current user profile
router.get('/me', verifyToken, getMe);

export default router;
