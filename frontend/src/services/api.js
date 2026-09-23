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

/**
 * Fetch all active services
 */
export const getServices = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/services`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: error.message || 'Failed to fetch services' };
  }
};

/**
 * Register Customer / User
 */
export const registerUserApi = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Register Service Technician
 */
export const registerTechnicianApi = async (techData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register-technician`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(techData),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Login user (Customer, Technician, or Admin)
 */
export const loginApi = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get current authenticated user profile
 */
export const getMeApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * =============================================================================
 * MODULE 2: COMPLAINT REGISTRATION & SERVICE BOOKING APIS
 * =============================================================================
 */

/**
 * Create a new complaint / service booking (Supports FormData for image upload)
 */
export const createBookingApi = async (formData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get customer's personal complaints & bookings
 */
export const getMyBookingsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/my-bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get specific booking details & timeline by ID
 */
export const getBookingDetailsApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get customer-facing recommendations for a booking (Top 3 ranked technicians)
 */
export const getBookingRecommendationsApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/recommendations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Customer selects a recommended technician for their booking
 */
export const selectTechnicianApi = async (bookingId, technicianId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/select-technician`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ technician_id: technicianId }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Cancel a booking
 */
export const cancelBookingApi = async (bookingId, reason, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get technician service jobs
 */
export const getTechnicianJobsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/technician`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get technician recommended service requests (pending)
 */
export const getTechnicianServiceRequestsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/technician/requests`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get technician assigned / accepted jobs
 */
export const getTechnicianAssignedJobsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/technician/assigned`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Accept a service booking (Technician)
 */
export const acceptBookingApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Reject a service booking (Technician)
 */
export const rejectBookingApi = async (bookingId, reason, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get all platform bookings (Admin)
 */
export const getAllBookingsApi = async (token, filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const url = `${API_BASE_URL}/bookings${params ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * =============================================================================
 * MODULE 4: SERVICE LIFECYCLE APIS
 * =============================================================================
 */

/**
 * Start service on an accepted booking (Technician)
 */
export const startServiceApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/start`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Mark service as completed (Technician)
 */
export const completeServiceApi = async (bookingId, serviceNotes, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ service_notes: serviceNotes }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

