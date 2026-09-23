import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getMyBookingsApi,
  getBookingDetailsApi,
  cancelBookingApi,
  getBookingRecommendationsApi,
  selectTechnicianApi,
} from '../services/api.js';
import {
  TechnicianRecommendationsList,
  TechnicianRecommendationCard,
} from '../components/TechnicianRecommendationCard.jsx';

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

  // Recommendations modal state
  const [viewingRecommendationsBooking, setViewingRecommendationsBooking] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsList, setRecommendationsList] = useState([]);

  // Technician Selection Confirmation Modal State
  const [confirmingTechnician, setConfirmingTechnician] = useState(null);
  const [confirmingBooking, setConfirmingBooking] = useState(null);
  const [selectingLoading, setSelectingLoading] = useState(false);
  const [selectionSuccessMsg, setSelectionSuccessMsg] = useState('');

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
      const rawBookings = res.data.data || [];
      // Auto-hydrate recommendations for any pending/unassigned/rejected booking if missing
      const enhancedBookings = await Promise.all(
        rawBookings.map(async (b) => {
          if (
            ['pending', 'customer_selected_technician', 'technician_rejected', 'technician_assigned'].includes(b.booking_status) &&
            !b.technician_name &&
            (!b.top_recommendation && (!b.recommendations || b.recommendations.length === 0))
          ) {
            try {
              const recRes = await getBookingRecommendationsApi(b.id, token);
              if (recRes.ok && recRes.data.success) {
                return {
                  ...b,
                  recommendations: recRes.data.data || [],
                  top_recommendation:
                    recRes.data.top_recommendation ||
                    (recRes.data.data && recRes.data.data[0]) ||
                    null,
                };
              }
            } catch (e) {
              console.error('Error auto-hydrating recommendations for booking', b.id, e);
            }
          }
          return b;
        })
      );
      setBookings(enhancedBookings);
    } else {
      setError(res.data?.message || 'Failed to load bookings.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  // Initiate technician selection confirmation modal
  const handleInitiateSelectTechnician = (booking, technician) => {
    setConfirmingBooking(booking);
    setConfirmingTechnician(technician);
  };

  // Confirm technician selection via PUT /api/bookings/:id/select-technician
  const handleConfirmTechnicianSelection = async () => {
    if (!confirmingBooking || !confirmingTechnician) return;
    setSelectingLoading(true);
    const res = await selectTechnicianApi(
      confirmingBooking.id,
      confirmingTechnician.technicianId,
      token
    );
    setSelectingLoading(false);
    if (res.ok && res.data.success) {
      setConfirmingTechnician(null);
      setConfirmingBooking(null);
      if (viewingRecommendationsBooking) {
        setViewingRecommendationsBooking(null);
      }
      setSelectionSuccessMsg(res.data.message || 'Technician selected! Waiting for technician confirmation.');
      setTimeout(() => setSelectionSuccessMsg(''), 6000);
      fetchBookings();
    } else {
      alert(res.data?.message || 'Failed to select technician.');
    }
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success"><i className="bi bi-check2-all me-1"></i> Service Completed</span>;
      case 'in_progress':
        return <span className="badge bg-info text-dark"><i className="bi bi-gear-fill me-1"></i> Service In Progress</span>;
      case 'accepted':
        return <span className="badge bg-primary"><i className="bi bi-person-check-fill me-1"></i> Technician Confirmed</span>;
      case 'customer_selected_technician':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i className="bi bi-clock-history me-1"></i> Waiting Confirmation</span>;
      case 'technician_rejected':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle"><i className="bi bi-person-x-fill me-1"></i> Tech Declined</span>;
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

  // Open Recommended Technicians Modal
  const handleOpenRecommendations = async (booking) => {
    setViewingRecommendationsBooking(booking);
    if (booking.recommendations && booking.recommendations.length > 0) {
      setRecommendationsList(booking.recommendations);
    } else {
      setLoadingRecommendations(true);
      const res = await getBookingRecommendationsApi(booking.id, token);
      if (res.ok && res.data.success) {
        setRecommendationsList(res.data.data || []);
      } else {
        setRecommendationsList([]);
      }
      setLoadingRecommendations(false);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['pending', 'customer_selected_technician', 'technician_rejected', 'technician_assigned'].includes(b.booking_status);
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

      {/* Selection Success Notification */}
      {selectionSuccessMsg && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm rounded-3 mb-4 d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill fs-5 me-2"></i>
          <div>
            <strong>{selectionSuccessMsg}</strong>
          </div>
          <button type="button" className="btn-close ms-auto" onClick={() => setSelectionSuccessMsg('')}></button>
        </div>
      )}

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

                  {/* Technician Info / Intelligent Recommendation Preview */}
                  {booking.booking_status === 'customer_selected_technician' ? (
                    <div className="p-3 bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 pb-2 border-bottom border-warning-subtle">
                        <div className="d-flex align-items-center gap-2">
                          <div className="spinner-grow spinner-grow-sm text-warning" role="status"></div>
                          <strong className="fs-6">Waiting for technician confirmation</strong>
                        </div>
                        <span className="badge bg-warning text-dark fw-bold">Selection Sent</span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                        <div>
                          <small className="text-muted d-block">Selected Technician</small>
                          <strong className="text-dark fs-6">
                            {booking.selected_technician?.technicianName || booking.technician_name || 'Selected Technician'}
                          </strong>
                          <small className="text-muted d-block">
                            {booking.selected_technician?.experienceYears || 0} yrs exp &bull; {booking.service_name}
                          </small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle fw-bold">
                            <i className="bi bi-stars text-warning me-1"></i>
                            {booking.selected_technician?.matchScore || 90}% Match
                          </span>
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-star-fill me-1"></i>
                            {booking.selected_technician?.averageRating || booking.technician_rating || '5.0'}
                          </span>
                          {booking.selected_technician?.distanceKm !== null && booking.selected_technician?.distanceKm !== undefined && (
                            <span className="badge bg-light text-success border font-monospace">
                              <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                              {booking.selected_technician.distanceKm} km
                            </span>
                          )}
                          <span className="badge bg-light text-primary border">
                            ₹{booking.selected_technician?.visitingCharges || booking.technician_visiting_charges || 150} fee
                          </span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top border-warning-subtle small flex-wrap gap-2">
                        <span className="text-muted">
                          <i className="bi bi-calendar-event me-1 text-primary"></i>
                          Appointment: {new Date(booking.scheduled_date).toLocaleDateString()} &bull; {booking.scheduled_time_slot}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary py-0 px-2 fw-semibold"
                          onClick={() => handleOpenRecommendations(booking)}
                        >
                          <i className="bi bi-stars me-1"></i> View Recommendations
                        </button>
                      </div>
                    </div>
                  ) : booking.booking_status === 'technician_rejected' ? (
                    <div className="p-3 bg-danger-subtle text-danger-emphasis border border-danger-subtle rounded-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 pb-2 border-bottom border-danger-subtle">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                          <strong className="fs-6">Technician declined — choose another technician</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary fw-semibold px-3 shadow-sm"
                          onClick={() => handleOpenRecommendations(booking)}
                        >
                          <i className="bi bi-people-fill me-1"></i> Choose Another Technician
                        </button>
                      </div>
                      <div className="bg-white p-2 rounded-2 border small">
                        <span className="text-danger fw-semibold d-block">
                          <i className="bi bi-info-circle-fill me-1"></i> Rejection Reason:
                        </span>
                        <span className="text-muted">
                          {booking.rejection_reason || 'Technician was unavailable at the requested appointment time.'}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-top border-danger-subtle d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <span className="small text-muted">
                          Review remaining recommended technicians to select an alternative.
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-0 px-2 fw-semibold"
                          onClick={() => handleOpenRecommendations(booking)}
                        >
                          View Remaining Technicians
                        </button>
                      </div>
                    </div>
                  ) : booking.technician_name ? (
                    <div className={`p-3 rounded-3 border mb-3 ${
                      booking.booking_status === 'completed'
                        ? 'bg-success-subtle text-success-emphasis border-success-subtle'
                        : booking.booking_status === 'in_progress'
                        ? 'bg-info-subtle text-dark border-info-subtle'
                        : 'bg-primary-subtle text-dark border-primary-subtle'
                    }`}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 pb-2 border-bottom border-opacity-25 border-secondary">
                        <div>
                          <div className="d-flex align-items-center gap-1 mb-1">
                            {booking.booking_status === 'completed' && (
                              <i className="bi bi-check2-all text-success fs-5"></i>
                            )}
                            {booking.booking_status === 'in_progress' && (
                              <span className="spinner-grow spinner-grow-sm text-info me-1" role="status"></span>
                            )}
                            {booking.booking_status === 'accepted' && (
                              <i className="bi bi-person-check-fill text-primary me-1"></i>
                            )}
                            <strong className="fs-6 text-dark">
                              {booking.booking_status === 'completed'
                                ? 'Service Completed'
                                : booking.booking_status === 'in_progress'
                                ? 'Service In Progress'
                                : 'Technician Confirmed'}
                            </strong>
                          </div>
                          <strong className="text-dark fs-6 d-block">{booking.technician_name}</strong>
                          <small className="text-muted">
                            <i className="bi bi-telephone-fill me-1 text-success"></i>
                            +91 {booking.technician_phone}
                          </small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-star-fill me-1"></i>
                            {booking.technician_rating || '5.0'}
                          </span>
                          <span className="badge bg-light text-primary border">
                            ₹{booking.technician_visiting_charges || 150} visiting
                          </span>
                        </div>
                      </div>

                      <div className="small text-muted d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <span>
                          <i className="bi bi-calendar2-check me-1 text-primary"></i>
                          Appointment: {new Date(booking.scheduled_date).toLocaleDateString()} &bull; {booking.scheduled_time_slot}
                        </span>
                        <span className={`badge ${
                          booking.booking_status === 'completed'
                            ? 'bg-success text-white'
                            : booking.booking_status === 'in_progress'
                            ? 'bg-info text-dark'
                            : 'bg-primary text-white'
                        }`}>
                          {booking.booking_status === 'completed'
                            ? 'Service Completed'
                            : booking.booking_status === 'in_progress'
                            ? 'Service In Progress'
                            : 'Technician Confirmed'}
                        </span>
                      </div>

                      {/* If completed, show completion time and technician service notes */}
                      {booking.booking_status === 'completed' && (
                        <div className="mt-2 pt-2 border-top border-success-subtle">
                          {booking.completed_at && (
                            <div className="small text-muted mb-1">
                              <i className="bi bi-clock-history me-1 text-success"></i>
                              Completed on:{' '}
                              <strong>
                                {new Date(booking.completed_at).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </strong>
                            </div>
                          )}
                          {booking.service_notes && (
                            <div className="bg-white p-2 rounded border small mt-1">
                              <strong className="text-dark d-block">
                                <i className="bi bi-journal-text me-1 text-primary"></i>
                                Service Notes from Technician:
                              </strong>
                              <span className="text-secondary">{booking.service_notes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* If in progress, show indicator message */}
                      {booking.booking_status === 'in_progress' && (
                        <div className="mt-2 pt-2 border-top border-info-subtle small text-secondary">
                          <i className="bi bi-tools me-1 text-info"></i>
                          Technician is actively working on your repair. You will see completion details once finished.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 small fw-semibold">
                          <i className="bi bi-search me-1 text-primary"></i>
                          Finding recommended technicians
                        </span>
                        {booking.recommendations && booking.recommendations.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2 fw-semibold"
                            onClick={() => handleOpenRecommendations(booking)}
                          >
                            <i className="bi bi-people-fill me-1"></i> View All ({booking.recommendations.length}) Matches
                          </button>
                        )}
                      </div>
                      {(booking.top_recommendation || (booking.recommendations && booking.recommendations.length > 0)) ? (
                        <TechnicianRecommendationCard
                          rec={booking.top_recommendation || booking.recommendations[0]}
                          rank={1}
                          defaultExpanded={true}
                          onSelectTechnician={(tech) => handleInitiateSelectTechnician(booking, tech)}
                          selectable={true}
                          isSelecting={selectingLoading}
                        />
                      ) : (
                        <div className="p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="small text-muted">
                            <i className="bi bi-hourglass-split text-primary me-1"></i>
                            Finding recommended technicians...
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-0 px-2 fw-semibold"
                            onClick={() => handleOpenRecommendations(booking)}
                          >
                            <i className="bi bi-stars me-1"></i> View Matches
                          </button>
                        </div>
                      )}
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
                        className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
                        onClick={() => handleOpenRecommendations(booking)}
                        title="View recommended technician rankings & criteria breakdown"
                      >
                        <i className="bi bi-stars"></i>
                        <span>Recommendations</span>
                      </button>

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

                {/* Recommendations in Details Modal */}
                {selectedBookingDetails.recommendations && selectedBookingDetails.recommendations.length > 0 && (
                  <div className="mt-4 pt-3 border-top">
                    <TechnicianRecommendationsList
                      recommendations={selectedBookingDetails.recommendations}
                      title="Intelligent Technician Recommendations (Top Matches)"
                    />
                  </div>
                )}
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

      {/* CONFIRM TECHNICIAN MODAL */}
      {confirmingTechnician && confirmingBooking && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow overflow-hidden">
              <div className="modal-header bg-primary text-white">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-person-check-fill fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Confirm Technician</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setConfirmingTechnician(null);
                    setConfirmingBooking(null);
                  }}
                  disabled={selectingLoading}
                ></button>
              </div>

              <div className="modal-body p-4">
                <p className="text-dark mb-3">
                  You are selecting <strong>{confirmingTechnician.technicianName}</strong> for this service.
                </p>

                <div className="bg-light p-3 rounded-3 border mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted small">Technician:</span>
                    <strong className="text-dark">{confirmingTechnician.technicianName}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted small">Specialization:</span>
                    <span className="text-dark">{confirmingTechnician.serviceName}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted small">Match Percentage:</span>
                    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle fw-bold">
                      <i className="bi bi-stars text-warning me-1"></i>
                      {confirmingTechnician.matchScore}%
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted small">Distance:</span>
                    <strong className="text-success">
                      {confirmingTechnician.distanceKm !== null && confirmingTechnician.distanceKm !== undefined
                        ? `${confirmingTechnician.distanceKm} km`
                        : confirmingTechnician.city || 'Nearby'}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted small">Rating:</span>
                    <span className="badge bg-warning text-dark">
                      <i className="bi bi-star-fill me-1"></i>
                      {confirmingTechnician.averageRating ? Number(confirmingTechnician.averageRating).toFixed(1) : '5.0'} / 5.0
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted small">Experience:</span>
                    <strong className="text-dark">{confirmingTechnician.experienceYears || 0} Years</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Visiting Fee:</span>
                    <strong className="text-primary fs-6">
                      ₹{confirmingTechnician.visitingCharges || 150}
                    </strong>
                  </div>
                </div>

                <p className="small text-muted mb-0">
                  <i className="bi bi-info-circle me-1 text-primary"></i>
                  Your request will be sent to this technician. Booking status will update to <strong>Waiting for technician confirmation</strong>.
                </p>
              </div>

              <div className="modal-footer bg-light border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-4"
                  onClick={() => {
                    setConfirmingTechnician(null);
                    setConfirmingBooking(null);
                  }}
                  disabled={selectingLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm"
                  onClick={handleConfirmTechnicianSelection}
                  disabled={selectingLoading}
                >
                  {selectingLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1"></i> Confirm Technician
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS MODAL */}
      {viewingRecommendationsBooking && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header bg-light border-bottom">
                <div>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace mb-1">
                    {viewingRecommendationsBooking.booking_reference}
                  </span>
                  <h5 className="modal-title fw-bold text-dark mb-0">
                    Intelligent Technician Recommendations
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewingRecommendationsBooking(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 bg-light rounded-3 border mb-3 small">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <span className="text-muted d-block">Service Required:</span>
                      <strong className="text-dark">{viewingRecommendationsBooking.service_name}</strong>
                    </div>
                    <div className="col-12 col-md-4">
                      <span className="text-muted d-block">Scheduled Appointment:</span>
                      <strong className="text-dark">
                        {new Date(viewingRecommendationsBooking.scheduled_date).toLocaleDateString()} &bull;{' '}
                        {viewingRecommendationsBooking.scheduled_time_slot}
                      </strong>
                    </div>
                    <div className="col-12 col-md-4">
                      <span className="text-muted d-block">Location:</span>
                      <strong className="text-dark text-truncate d-block">
                        {viewingRecommendationsBooking.service_address},{' '}
                        {viewingRecommendationsBooking.city} ({viewingRecommendationsBooking.pincode})
                      </strong>
                    </div>
                  </div>
                </div>

                {loadingRecommendations ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted small mt-2">
                      Computing technician match scores & distances...
                    </p>
                  </div>
                ) : (
                  <TechnicianRecommendationsList
                    recommendations={recommendationsList}
                    title="Ranked Technician Recommendations (Top Matches)"
                    onSelectTechnician={(tech) => handleInitiateSelectTechnician(viewingRecommendationsBooking, tech)}
                    selectedTechnicianId={viewingRecommendationsBooking.technician_id}
                    selectable={['pending', 'technician_rejected'].includes(viewingRecommendationsBooking.booking_status)}
                    isSelecting={selectingLoading}
                  />
                )}
              </div>
              <div className="modal-footer bg-light border-top">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => setViewingRecommendationsBooking(null)}
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
