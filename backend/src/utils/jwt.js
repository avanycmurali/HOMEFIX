import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'homefix_super_secret_jwt_key_2026_mca_secure!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a signed JWT token
 * @param {Object} payload - User information to encode ({ id, email, role, name })
 * @returns {string} Signed JWT token
 */
export const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify a JWT token
 * @param {string} token - The raw JWT token string
 * @returns {Object} Decoded token payload
 */
export const decodeToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
