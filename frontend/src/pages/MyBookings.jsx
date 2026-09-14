import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyBookingsApi, getBookingDetailsApi, cancelBookingApi } from '../services/api.js';

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal states
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Photo viewer modal state
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'user') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const fetchBookings = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const res = await getMyBookingsApi(token);
    if (res.ok && res.data.success) {
      setBookings(res.data.data);
    } else {
      setError(res.data?.message || 'Failed to load bookings.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success"><i className="bi bi-check2-all me-1"></i> Completed</span>;
      case 'in_progress':
        return <span className="badge bg-info text-dark"><i className="bi bi-gear-fill me-1"></i> In Progress</span>;
      case 'accepted':
        return <span className="badge bg-primary"><i className="bi bi-hand-thumbs-up-fill me-1"></i> Accepted</span>;
      case 'technician_assigned':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle"><i className="bi bi-person-check-fill me-1"></i> Tech Assigned</span>;
      case 'cancelled':
        return <span className="badge bg-secondary"><i className="bi bi-x-circle me-1"></i> Cancelled</span>;
      case 'rejected':
        return <span className="badge bg-danger"><i className="bi bi-slash-circle me-1"></i> Rejected</span>;
      default:
        return <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1"></i> Pending</span>;
    }
  };

  // Urgency badge styling
  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'emergency':
        return <span className="badge bg-danger text-uppercase">Emergency</span>;
      case 'high':
        return <span className="badge bg-warning text-dark text-uppercase">High</span>;
      case 'low':
        return <span className="badge bg-light text-muted border text-uppercase">Low</span>;
      default:
        return <span className="badge bg-light text-dark border text-uppercase">Medium</span>;
    }
  };

  // Open Details Modal with Status Timeline
  const handleViewDetails = async (bookingId) => {
    setLoadingDetails(true);
    const res = await getBookingDetailsApi(bookingId, token);
    if (res.ok && res.data.success) {
      setSelectedBookingDetails(res.data);
    }
    setLoadingDetails(false);
  };

  // Handle Booking Cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;
    setCancellingLoading(true);
    const res = await cancelBookingApi(cancellingBookingId, cancelReason || 'Cancelled by customer', token);
    setCancellingLoading(false);

    if (res.ok && res.data.success) {
      setCancellingBookingId(null);
      setCancelReason('');
      fetchBookings();
    } else {
      alert(res.data?.message || 'Failed to cancel booking.');
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['pending', 'technician_assigned'].includes(b.booking_status);
    if (activeFilter === 'in_progress') return ['accepted', 'in_progress'].includes(b.booking_status);
    if (activeFilter === 'completed') return b.booking_status === 'completed';
    if (activeFilter === 'cancelled') return ['cancelled', 'rejected'].includes(b.booking_status);
    return true;
  });

  return (
    <div className="container py-5">
      {/* Header Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1 text-dark">My Service Complaints & Bookings</h2>
          <p className="text-muted mb-0">Track real-time status, technician details, and service logs</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={fetchBookings} className="btn btn-outline-primary btn-sm" disabled={loading}>
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spin' : ''}`}></i> Refresh
          </button>
          <Link to="/book-service" className="btn btn-primary btn-sm fw-semibold shadow-sm">
            <i className="bi bi-plus-circle me-1"></i> Register New Complaint
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="nav nav-pills bg-white p-1 rounded-3 border mb-4 shadow-sm" role="tablist">
        {[
          { key: 'all', label: 'All Requests' },
          { key: 'pending', label: 'Pending Assignment' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`nav-link py-2 px-3 fw-semibold ${activeFilter === tab.key ? 'active shadow-sm' : 'text-secondary'}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted mt-2">Loading your service requests...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="card shadow-sm border-0 rounded-4 text-center py-5">
          <div className="card-body">
            <i className="bi bi-clipboard-x text-muted fs-1 mb-3 d-block"></i>
            <h5 className="fw-bold text-dark">No Service Requests Found</h5>
            <p className="text-muted small mx-auto" style={{ maxWidth: '400px' }}>
              {activeFilter === 'all'
                ? "You haven't registered any home service complaints yet."
                : `No requests found matching the "${activeFilter}" filter.`}
            </p>
            <Link to="/book-service" className="btn btn-primary btn-sm px-4 mt-2">
              <i className="bi bi-plus-lg me-1"></i> Register a Complaint Now
            </Link>
          </div>
        </div>
      ) : (
        /* Bookings Grid */
        <div className="row g-4">
          {filteredBookings.map((booking) => (
            <div className="col-12 col-lg-6" key={booking.id}>
              <div className="card shadow-sm border-0 rounded-4 h-100 overflow-hidden">
                {/* Card Header */}
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-primary border font-monospace fs-6">
                      {booking.booking_reference}
                    </span>
                    {getUrgencyBadge(booking.urgency_level)}
                  </div>
                  <div>{getStatusBadge(booking.booking_status)}</div>
                </div>

                {/* Card Body */}
                <div className="card-body p-4">
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <div className="bg-primary-subtle text-primary p-3 rounded-3 fs-4">
                      <i className={`bi ${booking.service_icon || 'bi-tools'}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <span className="text-muted small text-uppercase fw-bold">{booking.service_name}</span>
                      <h5 className="fw-bold text-dark mb-1">{booking.problem_title}</h5>
                      <p className="text-secondary small mb-0 text-truncate" style={{ maxWidth: '350px' }}>
                        {booking.problem_description}
                      </p>
                    </div>
                  </div>

                  {/* Appointment info */}
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="row g-2 small">
                      <div className="col-6">
                        <span className="text-muted d-block">Scheduled For:</span>
                        <strong>
                          {new Date(booking.scheduled_date).toLocaleDateString()}
                        </strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Time Slot:</span>
                        <strong className="text-truncate d-block">{booking.scheduled_time_slot}</strong>
                      </div>
                      <div className="col-12 mt-2 pt-2 border-top">
                        <span className="text-muted d-block">Service Address:</span>
                        <span className="text-dark">
                          {booking.service_address}, {booking.city} - {booking.pincode}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technician Info (if assigned) */}
                  {booking.technician_name ? (
                    <div className="p-2 px-3 bg-success-subtle text-success-emphasis rounded-3 border border-success-subtle mb-3 d-flex justify-content-between align-items-center">
                      <div>
                        <small className="d-block text-muted">Assigned Technician</small>
                        <strong className="text-dark">{booking.technician_name}</strong> &bull;{' '}
                        <small>+91 {booking.technician_phone}</small>
                      </div>
                      <span className="badge bg-warning text-dark">
                        <i className="bi bi-star-fill me-1"></i>
                        {booking.technician_rating || '5.0'}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 px-3 bg-light rounded-3 border text-muted small mb-3">
                      <i className="bi bi-info-circle me-1"></i> Technician assignment in progress by recommendation system.
                    </div>
                  )}

                  {/* Problem Photo Thumbnail (if uploaded) */}
                  {booking.problem_image_url && (
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span className="small text-muted">Uploaded Photo:</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                        onClick={() => setPreviewPhotoUrl(booking.problem_image_url)}
                      >
                        <i className="bi bi-image"></i>
                        <span>View Attachment</span>
                      </button>
                    </div>
                  )}

                  {/* Pricing and Action Footer */}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <div>
                      <small className="text-muted d-block">Estimated Fee</small>
                      <strong className="text-primary fs-5">₹{booking.estimated_cost}</strong>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleViewDetails(booking.id)}
                      >
                        <i className="bi bi-info-circle me-1"></i> Timeline
                      </button>

                      {['pending', 'technician_assigned'].includes(booking.booking_status) && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setCancellingBookingId(booking.id)}
                        >
                          <i className="bi bi-x-circle me-1"></i> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS & TIMELINE MODAL */}
      {selectedBookingDetails && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header bg-light border-bottom">
                <h5 className="modal-title fw-bold">
                  Complaint Details: {selectedBookingDetails.booking.booking_reference}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedBookingDetails(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6">
                    <span className="text-muted small d-block">Service</span>
                    <strong className="fs-6">{selectedBookingDetails.booking.service_name}</strong>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted small d-block">Current Status</span>
                    {getStatusBadge(selectedBookingDetails.booking.booking_status)}
                  </div>
                  <div className="col-12">
                    <span className="text-muted small d-block">Problem Description</span>
                    <p className="text-dark bg-light p-3 rounded-3 border mb-0">
                      {selectedBookingDetails.booking.problem_description}
                    </p>
                  </div>
                </div>

                <h6 className="fw-bold mb-3 border-start border-3 border-primary ps-2">
                  Service Lifecycle Timeline
                </h6>
                <ul className="list-group list-group-flush border rounded-3">
                  {selectedBookingDetails.statusHistory?.map((log, idx) => (
                    <li className="list-group-item d-flex justify-content-between align-items-center py-3" key={log.id || idx}>
                      <div>
                        {getStatusBadge(log.status)}
                        <p className="mb-0 mt-1 small text-dark">{log.remarks}</p>
                        <small className="text-muted">By {log.changed_by_name} ({log.changed_by_role})</small>
                      </div>
                      <small className="text-secondary">{new Date(log.logged_at).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer bg-light border-top">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => setSelectedBookingDetails(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancellingBookingId && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">Cancel Service Complaint</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setCancellingBookingId(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted">
                  Are you sure you want to cancel this booking? Please provide a reason:
                </p>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. Fixed myself / Change of schedule / Plumber not needed anymore"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setCancellingBookingId(null)}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3"
                  onClick={handleConfirmCancel}
                  disabled={cancellingLoading}
                >
                  {cancellingLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewPhotoUrl && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-transparent border-0 text-center">
              <img
                src={previewPhotoUrl}
                alt="Problem full preview"
                className="img-fluid rounded-3 shadow-lg mx-auto"
                style={{ maxHeight: '80vh' }}
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-light btn-sm px-4 fw-semibold"
                  onClick={() => setPreviewPhotoUrl(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
