/**
 * API Service for HOMEFIX
 * Handles backend HTTP calls cleanly using standard fetch
 */

const API_BASE_URL = '/api';

/**
 * Check backend health status
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};
