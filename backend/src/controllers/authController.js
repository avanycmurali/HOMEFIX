import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { PINCODE_COORDINATES } from '../services/recommendationEngine.js';

// Regular expression for basic email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a regular Customer / User
 * POST /api/auth/register
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, city, pincode, address } = req.body;

    // Basic Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'A valid 10-digit phone number is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required.' });
    }
    if (!pincode || !pincode.trim()) {
      return res.status(400).json({ success: false, message: 'Pincode is required.' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [sanitizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address is already registered. Please log in.',
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, address, city, pincode, status)
       VALUES (?, ?, ?, ?, 'user', ?, ?, ?, 'active')`,
      [
        name.trim(),
        sanitizedEmail,
        hashedPassword,
        phone.trim(),
        address ? address.trim() : null,
        city.trim(),
        pincode.trim(),
      ]
    );

    const userId = result.insertId;

    // Create user object without password
    const user = {
      id: userId,
      name: name.trim(),
      email: sanitizedEmail,
      phone: phone.trim(),
      role: 'user',
      address: address ? address.trim() : null,
      city: city.trim(),
      pincode: pincode.trim(),
      status: 'active',
    };

    // Generate JWT token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to HOMEFIX.',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.',
      error: error.message,
    });
  }
};

/**
 * Register a Service Technician
 * POST /api/auth/register-technician
 */
export const registerTechnician = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      name,
      email,
      password,
      phone,
      city,
      pincode,
      address,
      service_id,
      experience_years,
      qualification,
      hourly_rate,
      visiting_charges,
      service_area,
      bio,
      latitude = null,
      longitude = null,
    } = req.body;

    // Basic Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'A valid 10-digit phone number is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required.' });
    }
    if (!pincode || !pincode.trim()) {
      return res.status(400).json({ success: false, message: 'Pincode is required.' });
    }
    if (!service_id) {
      return res.status(400).json({ success: false, message: 'Primary service category is required.' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Check duplicate email
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [sanitizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address is already registered. Please log in.',
      });
    }

    // Verify service exists
    const [serviceCheck] = await connection.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [service_id]
    );
    if (serviceCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected service category is invalid or unavailable.',
      });
    }
    const serviceName = serviceCheck[0].name;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Begin transactional creation of user and technician_profile
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password, phone, role, address, city, pincode, status)
       VALUES (?, ?, ?, ?, 'technician', ?, ?, ?, 'active')`,
      [
        name.trim(),
        sanitizedEmail,
        hashedPassword,
        phone.trim(),
        address ? address.trim() : null,
        city.trim(),
        pincode.trim(),
      ]
    );

    const userId = userResult.insertId;

    const parsedExp = Math.max(0, parseInt(experience_years, 10) || 0);
    const parsedHourly = Math.max(0, parseFloat(hourly_rate) || 250.0);
    const parsedVisiting = Math.max(0, parseFloat(visiting_charges) || 150.0);

    let parsedLat = latitude != null && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    let parsedLon = longitude != null && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;

    if (parsedLat === null && parsedLon === null) {
      const pin = (pincode || '').trim();
      if (PINCODE_COORDINATES[pin]) {
        parsedLat = PINCODE_COORDINATES[pin].lat;
        parsedLon = PINCODE_COORDINATES[pin].lon;
      }
    }

    const [profileResult] = await connection.query(
      `INSERT INTO technician_profiles 
       (user_id, service_id, experience_years, qualification, hourly_rate, visiting_charges, service_area, city, pincode, latitude, longitude, bio, availability_status, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 'pending')`,
      [
        userId,
        service_id,
        parsedExp,
        qualification ? qualification.trim() : null,
        parsedHourly,
        parsedVisiting,
        service_area ? service_area.trim() : null,
        city.trim(),
        pincode.trim(),
        parsedLat,
        parsedLon,
        bio ? bio.trim() : null,
      ]
    );

    await connection.commit();

    const user = {
      id: userId,
      name: name.trim(),
      email: sanitizedEmail,
      phone: phone.trim(),
      role: 'technician',
      address: address ? address.trim() : null,
      city: city.trim(),
      pincode: pincode.trim(),
      status: 'active',
    };

    const technicianProfile = {
      id: profileResult.insertId,
      user_id: userId,
      service_id,
      service_name: serviceName,
      experience_years: parsedExp,
      qualification: qualification ? qualification.trim() : null,
      hourly_rate: parsedHourly,
      visiting_charges: parsedVisiting,
      service_area: service_area ? service_area.trim() : null,
      city: city.trim(),
      pincode: pincode.trim(),
      bio: bio ? bio.trim() : null,
      availability_status: 'available',
      verification_status: 'pending',
    };

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(201).json({
      success: true,
      message: 'Technician registered successfully! Profile verification is pending admin review.',
      token,
      user,
      technicianProfile,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Technician registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during technician registration.',
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Login for User, Technician, and Admin
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are both required.',
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Query user by email
    const [rows] = await pool.query(
      `SELECT id, name, email, password, phone, role, address, city, pincode, profile_image, status 
       FROM users WHERE email = ?`,
      [sanitizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is currently ${user.status}. Please contact HOMEFIX support.`,
      });
    }

    // Verify role matches expected portal (if specified)
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This login portal is for ${expectedRole} accounts. Your account has the role '${user.role}'. Please use the ${user.role} login portal.`,
      });
    }

    // Fetch technician profile details if technician
    let technicianProfile = null;
    if (user.role === 'technician') {
      const [techProfiles] = await pool.query(
        `SELECT tp.*, s.name AS service_name, s.icon AS service_icon
         FROM technician_profiles tp
         LEFT JOIN services s ON tp.service_id = s.id
         WHERE tp.user_id = ?`,
        [user.id]
      );
      if (techProfiles.length > 0) {
        technicianProfile = techProfiles[0];
      }
    }

    // Generate JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Strip password before returning
    delete user.password;

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user,
      technicianProfile,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
      error: error.message,
    });
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, address, city, pincode, profile_image, status, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = rows[0];
    let technicianProfile = null;

    if (user.role === 'technician') {
      const [techProfiles] = await pool.query(
        `SELECT tp.*, s.name AS service_name, s.icon AS service_icon
         FROM technician_profiles tp
         LEFT JOIN services s ON tp.service_id = s.id
         WHERE tp.user_id = ?`,
        [user.id]
      );
      if (techProfiles.length > 0) {
        technicianProfile = techProfiles[0];
      }
    }

    return res.status(200).json({
      success: true,
      user,
      technicianProfile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
      error: error.message,
    });
  }
};

/**
 * Request password reset link (Customer, Technician, Admin)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address.',
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Query user by email
    const [rows] = await pool.query(
      'SELECT id, name, email, status, reset_password_requested_at FROM users WHERE email = ?',
      [sanitizedEmail]
    );

    // Standard generic message to avoid email enumeration
    const genericSuccessMessage =
      'If an account with that email exists, password reset instructions have been sent.';

    // If user not found or not active, return generic success message immediately
    if (rows.length === 0 || rows[0].status !== 'active') {
      return res.status(200).json({
        success: true,
        message: genericSuccessMessage,
      });
    }

    const user = rows[0];

    // Rate-limiting check: Prevent multiple token requests within 60 seconds
    if (user.reset_password_requested_at) {
      const elapsedMs = Date.now() - new Date(user.reset_password_requested_at).getTime();
      if (elapsedMs < 60 * 1000) {
        return res.status(200).json({
          success: true,
          message: genericSuccessMessage,
        });
      }
    }

    // Generate 32-byte cryptographically secure random token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Generate SHA-256 hash to store in database (never store plain-text token)
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Save hashed token and expiry in database
    await pool.query(
      `UPDATE users 
       SET reset_password_token = ?, 
           reset_password_expires = ?, 
           reset_password_requested_at = NOW() 
       WHERE id = ?`,
      [hashedToken, expiresAt, user.id]
    );

    const responsePayload = {
      success: true,
      message: genericSuccessMessage,
    };

    // In development / demo environment without an email provider, provide helper metadata
    if (process.env.NODE_ENV !== 'production') {
      responsePayload._dev = {
        note: 'Development/Demo mode: No email service configured.',
        resetToken: rawToken,
        resetUrl: `http://localhost:5173/reset-password?token=${rawToken}`,
        expiresInMinutes: 15,
      };
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. Please try again later.',
      error: error.message,
    });
  }
};

/**
 * Verify whether a reset token is valid and not expired
 * GET /api/auth/verify-reset-token/:token
 */
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const [rows] = await pool.query(
      `SELECT id, email FROM users 
       WHERE reset_password_token = ? 
         AND reset_password_expires > NOW() 
         AND status = 'active'`,
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reset token is valid.',
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify reset token.',
      error: error.message,
    });
  }
};

/**
 * Reset user password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Hash the raw token to compare against database
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Find active user with matching unexpired token
    const [rows] = await pool.query(
      `SELECT id, email, status FROM users 
       WHERE reset_password_token = ? 
         AND reset_password_expires > NOW() 
         AND status = 'active'`,
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired. Please request a new one.',
      });
    }

    const user = rows[0];

    // Hash new password using existing bcryptjs setup (10 salt rounds)
    const saltRounds = 10;
    const newHashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and invalidate the reset token immediately
    await pool.query(
      `UPDATE users 
       SET password = ?, 
           reset_password_token = NULL, 
           reset_password_expires = NULL, 
           reset_password_requested_at = NULL 
       WHERE id = ?`,
      [newHashedPassword, user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.',
      error: error.message,
    });
  }
};

