import { pool } from '../config/db.js';

/**
 * Get all active home service categories
 */
export const getAllServices = async (req, res) => {
  try {
    const [services] = await pool.query(
      'SELECT id, name, description, base_price, icon, is_active FROM services WHERE is_active = TRUE ORDER BY name ASC'
    );

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve service categories.',
      error: error.message,
    });
  }
};
