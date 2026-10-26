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
 * Request password reset link (Forgot Password)
 */
export const forgotPasswordApi = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Verify validity of a password reset token
 */
export const verifyResetTokenApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-reset-token/${encodeURIComponent(token)}`);
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Reset password using token
 */
export const resetPasswordApi = async (token, password, confirmPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword }),
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

/**
 * Intelligent Rule-Based Tool & Material Recommendations (Assigned Technician)
 * GET /api/bookings/:id/tool-material-suggestions
 */
export const getToolMaterialSuggestionsApi = async (bookingId, token, refresh = false) => {
  try {
    const url = `${API_BASE_URL}/bookings/${bookingId}/tool-material-suggestions${refresh ? '?refresh=true' : ''}`;
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
 * MODULE: RAZORPAY TEST PAYMENT APIS
 * =============================================================================
 */

/**
 * Create a Razorpay payment order for a completed booking
 * POST /api/bookings/:id/payment/order
 */
export const createPaymentOrderApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payment/order`, {
      method: 'POST',
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
 * Verify Razorpay payment signature
 * POST /api/bookings/:id/payment/verify
 */
export const verifyPaymentApi = async (bookingId, paymentData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get payment status for a booking
 * GET /api/bookings/:id/payment
 */
export const getBookingPaymentApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payment`, {
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

// =============================================================================
// MODULE 5: REVIEWS AND RATINGS API
// =============================================================================

/**
 * Submit customer review & rating for a completed booking
 * POST /api/bookings/:id/review
 */
export const submitBookingReviewApi = async (bookingId, { rating, review_comment }, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, review_comment }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Get review for a booking
 * GET /api/bookings/:id/review
 */
export const getBookingReviewApi = async (bookingId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/review`, {
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

// =============================================================================
// MODULE 5: ADMIN MANAGEMENT API
// =============================================================================

/**
 * Get Admin Dashboard Overview Statistics
 * GET /api/admin/dashboard-stats
 */
export const getAdminDashboardStatsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
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
 * Get All Customers (Admin)
 * GET /api/admin/customers
 */
export const getAdminCustomersApi = async (token, params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE_URL}/admin/customers?${query}` : `${API_BASE_URL}/admin/customers`;
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
 * Get Customer Profile, Service History & Payments (Admin)
 * GET /api/admin/customers/:id
 */
export const getAdminCustomerDetailsApi = async (customerId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
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
 * Update Customer Account Status (Admin)
 * PUT /api/admin/customers/:id/status
 */
export const updateCustomerStatusApi = async (customerId, status, token, remarks = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${customerId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, remarks }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Delete Customer Account (Admin)
 * DELETE /api/admin/customers/:id
 */
export const deleteCustomerApi = async (customerId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
      method: 'DELETE',
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
 * Get All Technicians (Admin)
 * GET /api/admin/technicians
 */
export const getAdminTechniciansApi = async (token, params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE_URL}/admin/technicians?${query}` : `${API_BASE_URL}/admin/technicians`;
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
 * Approve or Reject Technician Verification (Admin)
 * PUT /api/admin/technicians/:id/verify
 */
export const verifyTechnicianApi = async (technicianId, verification_status, token, remarks = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/technicians/${technicianId}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ verification_status, remarks }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Update Technician Account Status (Admin)
 * PUT /api/admin/technicians/:id/status
 */
export const updateTechnicianStatusApi = async (technicianId, status, token, remarks = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/technicians/${technicianId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, remarks }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Delete Technician Account (Admin)
 * DELETE /api/admin/technicians/:id
 */
export const deleteTechnicianApi = async (technicianId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/technicians/${technicianId}`, {
      method: 'DELETE',
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
 * Get All Bookings with Multi-Filtering (Admin)
 * GET /api/admin/bookings
 */
export const getAdminBookingsApi = async (token, filters = {}) => {
  try {
    const query = new URLSearchParams(filters).toString();
    const url = query ? `${API_BASE_URL}/admin/bookings?${query}` : `${API_BASE_URL}/admin/bookings`;
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
 * Get All Payments Ledger (Admin)
 * GET /api/admin/payments
 */
export const getAdminPaymentsApi = async (token, filters = {}) => {
  try {
    const query = new URLSearchParams(filters).toString();
    const url = query ? `${API_BASE_URL}/admin/payments?${query}` : `${API_BASE_URL}/admin/payments`;
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
 * Get All Reviews (Admin)
 * GET /api/admin/reviews
 */
export const getAdminReviewsApi = async (token, params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE_URL}/admin/reviews?${query}` : `${API_BASE_URL}/admin/reviews`;
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
 * Get Admin Audit Logs
 * GET /api/admin/audit-logs
 */
export const getAdminAuditLogsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/audit-logs`, {
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
 * Get Technician Earnings & Payout Summary
 * GET /api/technician/earnings
 */
export const getTechnicianEarningsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/technician/earnings`, {
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
 * Get All Technician Payouts (Admin)
 * GET /api/admin/payouts
 */
export const getAdminPayoutsApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/payouts`, {
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
 * Mark Technician Payout as Paid (Admin - Demo Payout)
 * PUT /api/admin/payouts/:id/mark-paid
 */
export const markPayoutPaidApi = async (payoutId, token, payload = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/payouts/${payoutId}/mark-paid`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 500, data: { success: false, message: error.message } };
  }
};

/**
 * Admin: Generate Technician Work Report for Selected Date
 * GET /api/admin/reports/technician-work?date=YYYY-MM-DD
 */
export const getAdminTechnicianWorkReportApi = async (date, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/reports/technician-work?date=${encodeURIComponent(date)}`, {
      method: 'GET',
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
 * Admin: Generate Customer / User Activity Report for Selected Date
 * GET /api/admin/reports/customer-activity?date=YYYY-MM-DD
 */
export const getAdminCustomerActivityReportApi = async (date, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/reports/customer-activity?date=${encodeURIComponent(date)}`, {
      method: 'GET',
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
 * Technician: Generate Own Work Report for Selected Date
 * GET /api/technician/reports/work?date=YYYY-MM-DD
 */
export const getTechnicianWorkReportApi = async (date, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/technician/reports/work?date=${encodeURIComponent(date)}`, {
      method: 'GET',
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
 * Customer / User: Generate Own Complaints & Bookings Report for Selected Date
 * GET /api/bookings/reports/customer?date=YYYY-MM-DD
 */
export const getCustomerComplaintsReportApi = async (date, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/reports/customer?date=${encodeURIComponent(date)}`, {
      method: 'GET',
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






