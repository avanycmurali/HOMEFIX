import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getTechnicianServiceRequestsApi,
  getTechnicianAssignedJobsApi,
  acceptBookingApi,
  rejectBookingApi,
  getBookingDetailsApi,
  startServiceApi,
  completeServiceApi,
} from '../services/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, technicianProfile, logout } = useAuth();

  // Technician workspace states
  const [techTab, setTechTab] = useState('requests'); // 'requests' | 'assigned' | 'profile'
  const [serviceRequests, setServiceRequests] = useState([]);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });
  const [serviceNotes, setServiceNotes] = useState({});
  const [jobStatusFilter, setJobStatusFilter] = useState('all');

  // Modals & UI states
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState('Schedule conflict');
  const [customReason, setCustomReason] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});
  const [selectedTimelineBooking, setSelectedTimelineBooking] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch technician service requests and active jobs
  const fetchTechnicianData = async () => {
    if (!token || user?.role !== 'technician') return;
    setLoadingRequests(true);
    setLoadingJobs(true);

    try {
      const [reqsRes, jobsRes] = await Promise.all([
        getTechnicianServiceRequestsApi(token),
        getTechnicianAssignedJobsApi(token),
      ]);

      if (reqsRes.ok && reqsRes.data?.success) {
        setServiceRequests(reqsRes.data.data || []);
      }
      if (jobsRes.ok && jobsRes.data?.success) {
        setAssignedJobs(jobsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load technician data:', err);
    } finally {
      setLoadingRequests(false);
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'technician') {
      fetchTechnicianData();
    }
  }, [user, token]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAccept = async (bookingId, bookingRef) => {
    setActionLoadingId(bookingId);
    setActionFeedback({ type: '', message: '' });
    const res = await acceptBookingApi(bookingId, token);
    setActionLoadingId(null);

    if (res.ok && res.data.success) {
      setActionFeedback({
        type: 'success',
        message: `Service request ${bookingRef || ''} accepted successfully! It is now in your Active Jobs.`,
      });
      fetchTechnicianData();
    } else {
      setActionFeedback({
        type: 'danger',
        message: res.data?.message || 'Failed to accept service request.',
      });
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingBooking) return;
    const bookingId = rejectingBooking.id;
    const finalReason =
      rejectReason === 'Other' && customReason.trim() ? customReason.trim() : rejectReason;

    setActionLoadingId(bookingId);
    setActionFeedback({ type: '', message: '' });
    const res = await rejectBookingApi(bookingId, finalReason, token);
    setActionLoadingId(null);
    setRejectingBooking(null);
    setCustomReason('');

    if (res.ok && res.data.success) {
      setActionFeedback({
        type: 'info',
        message: `Service request ${rejectingBooking.booking_reference} has been declined and will be offered to another matching technician.`,
      });
      fetchTechnicianData();
    } else {
      setActionFeedback({
        type: 'danger',
        message: res.data?.message || 'Failed to decline service request.',
      });
    }
  };

  const handleStartService = async (bookingId, bookingRef) => {
    setActionLoadingId(bookingId);
    setActionFeedback({ type: '', message: '' });
    const res = await startServiceApi(bookingId, token);
    setActionLoadingId(null);

    if (res.ok && res.data.success) {
      setActionFeedback({
        type: 'success',
        message: `Service for ${bookingRef || 'booking'} has started! Status is now In Progress.`,
      });
      fetchTechnicianData();
    } else {
      setActionFeedback({
        type: 'danger',
        message: res.data?.message || 'Failed to start service.',
      });
    }
  };

  const handleCompleteService = async (bookingId, bookingRef) => {
    const notes = serviceNotes[bookingId] || '';
    setActionLoadingId(bookingId);
    setActionFeedback({ type: '', message: '' });
    const res = await completeServiceApi(bookingId, notes, token);
    setActionLoadingId(null);

    if (res.ok && res.data.success) {
      setActionFeedback({
        type: 'success',
        message: `Service for ${bookingRef || 'booking'} has been marked as Completed!`,
      });
      setServiceNotes((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      fetchTechnicianData();
    } else {
      setActionFeedback({
        type: 'danger',
        message: res.data?.message || 'Failed to complete service.',
      });
    }
  };

  const toggleBreakdown = (bookingId) => {
    setExpandedBreakdowns((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  const handleViewTimeline = async (bookingId) => {
    setTimelineLoading(true);
    const res = await getBookingDetailsApi(bookingId, token);
    if (res.ok && res.data.success) {
      setSelectedTimelineBooking(res.data);
    }
    setTimelineLoading(false);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="badge bg-danger fs-6 px-3 py-2 rounded-pill">
            <i className="bi bi-shield-lock-fill me-1"></i> Administrator
          </span>
        );
      case 'technician':
        return (
          <span className="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill">
            <i className="bi bi-person-gear me-1"></i> Service Technician
          </span>
        );
      default:
        return (
          <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill">
            <i className="bi bi-person-check-fill me-1"></i> Customer
          </span>
        );
    }
  };

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success"><i className="bi bi-check2-all me-1"></i> Completed</span>;
      case 'in_progress':
        return <span className="badge bg-info text-dark"><i className="bi bi-gear-fill me-1"></i> In Progress</span>;
      case 'accepted':
        return <span className="badge bg-primary"><i className="bi bi-hand-thumbs-up-fill me-1"></i> Accepted</span>;
      case 'customer_selected_technician':
        return <span className="badge bg-warning text-dark border border-warning"><i className="bi bi-person-check-fill me-1"></i> Customer Selected</span>;
      case 'technician_assigned':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle"><i className="bi bi-person-check-fill me-1"></i> Tech Assigned</span>;
      case 'cancelled':
        return <span className="badge bg-secondary"><i className="bi bi-x-circle me-1"></i> Cancelled</span>;
      case 'technician_rejected':
      case 'rejected':
        return <span className="badge bg-danger"><i className="bi bi-slash-circle me-1"></i> Declined</span>;
      default:
        return <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1"></i> Pending</span>;
    }
  };

  return (
    <div className="container py-5">
      {/* Top Banner */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4 bg-dark text-white">
        <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              {getRoleBadge(user.role)}
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill small">
                <i className="bi bi-dot"></i> Active Account
              </span>
            </div>
            <h1 className="fw-bold mb-1">Welcome, {user.name}</h1>
            <p className="text-secondary mb-0">
              Authenticated via secure JWT token • Logged in as{' '}
              <strong className="text-white text-capitalize">{user.role}</strong>
            </p>
          </div>

          <div className="d-flex gap-2">
            <button onClick={handleLogout} className="btn btn-outline-light d-flex align-items-center gap-2">
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Account Profile Details & Quick Stats */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <i className="bi bi-person-lines-fill text-primary"></i>
                <span>Profile Information</span>
              </h5>
            </div>
            <div className="card-body p-4">
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                  <span className="text-muted small">Account ID</span>
                  <span className="fw-semibold">#{user.id}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                  <span className="text-muted small">Full Name</span>
                  <span className="fw-semibold">{user.name}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                  <span className="text-muted small">Email Address</span>
                  <span className="fw-semibold">{user.email}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                  <span className="text-muted small">Phone Number</span>
                  <span className="fw-semibold">+91 {user.phone}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                  <span className="text-muted small">City</span>
                  <span className="fw-semibold">{user.city || 'Bangalore'}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                  <span className="text-muted small">Postal Pincode</span>
                  <span className="fw-semibold">{user.pincode || '560001'}</span>
                </li>
                {user.address && (
                  <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                    <span className="text-muted small">Address</span>
                    <span className="fw-semibold text-end" style={{ maxWidth: '60%' }}>
                      {user.address}
                    </span>
                  </li>
                )}
                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                  <span className="text-muted small">Status</span>
                  <span className="badge bg-success text-capitalize">{user.status || 'Active'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* If technician, show quick stats card */}
          {user.role === 'technician' && technicianProfile && (
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-speedometer2 text-warning"></i>
                  <span>Technician Stats</span>
                </h6>
              </div>
              <div className="card-body p-3">
                <div className="row g-2 text-center">
                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="text-muted small d-block">Pending Requests</span>
                      <strong className="fs-4 text-warning">{serviceRequests.length}</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="text-muted small d-block">Active Jobs</span>
                      <strong className="fs-4 text-primary">{assignedJobs.length}</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="text-muted small d-block">Visiting Fee</span>
                      <strong className="fs-5 text-dark">₹{technicianProfile.visiting_charges}</strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <span className="text-muted small d-block">Rating</span>
                      <strong className="fs-5 text-warning">
                        <i className="bi bi-star-fill me-1"></i>
                        {technicianProfile.average_rating || '5.0'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Role-Specific Workspace */}
        <div className="col-12 col-lg-8">
          {/* CUSTOMER WORKSPACE */}
          {user.role === 'user' && (
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-house-door-fill text-primary"></i>
                  <span>Customer Service Hub</span>
                </h5>
              </div>
              <div className="card-body p-4">
                <p className="text-muted mb-4">
                  Welcome to your customer dashboard. From here, you can register new service requests, view past repairs, and manage your appliance maintenance.
                </p>

                <div className="d-flex gap-2 mb-4">
                  <Link to="/book-service" className="btn btn-primary btn-sm px-3 shadow-sm">
                    <i className="bi bi-plus-circle me-1"></i> Register New Complaint
                  </Link>
                  <Link to="/my-bookings" className="btn btn-outline-primary btn-sm px-3">
                    <i className="bi bi-card-checklist me-1"></i> My Bookings & Tracking
                  </Link>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <Link to="/book-service" className="text-decoration-none">
                      <div className="p-3 bg-light rounded-3 border h-100 hover-shadow transition-all">
                        <div className="d-flex align-items-center gap-2 text-primary mb-2">
                          <i className="bi bi-calendar2-plus fs-4"></i>
                          <h6 className="fw-bold mb-0">Module 2: Book Service</h6>
                        </div>
                        <p className="text-muted small mb-0">
                          Register complaint with photo, address & preferred time slot.
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="col-12 col-sm-6">
                    <Link to="/my-bookings" className="text-decoration-none">
                      <div className="p-3 bg-light rounded-3 border h-100 hover-shadow transition-all">
                        <div className="d-flex align-items-center gap-2 text-success mb-2">
                          <i className="bi bi-clock-history fs-4"></i>
                          <h6 className="fw-bold mb-0">My Complaints & History</h6>
                        </div>
                        <p className="text-muted small mb-0">
                          Track status of ongoing repairs and review assigned technicians.
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-warning mb-2">
                        <i className="bi bi-bell fs-4"></i>
                        <h6 className="fw-bold mb-0">Module 4: Reminders</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Scheduled preventative maintenance alerts for home appliances.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-info mb-2">
                        <i className="bi bi-chat-left-quote fs-4"></i>
                        <h6 className="fw-bold mb-0">Module 5: Reviews</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Rate and review completed technician visits and repairs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TECHNICIAN WORKSPACE */}
          {user.role === 'technician' && (
            <div className="card shadow-sm border-0 rounded-4">
              {/* Card Header with Navigation Tabs */}
              <div className="card-header bg-white border-bottom py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-tools text-warning fs-4"></i>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Technician Service Hub</h5>
                    <small className="text-muted">
                      Specialization: <strong className="text-dark">{technicianProfile?.service_name || 'Home Service'}</strong>
                    </small>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="nav nav-pills bg-light p-1 rounded-3 border" role="tablist">
                  <button
                    className={`nav-link py-1 px-3 fw-semibold small ${techTab === 'requests' ? 'active shadow-sm' : 'text-secondary'}`}
                    onClick={() => setTechTab('requests')}
                  >
                    <i className="bi bi-inbox me-1"></i>
                    Service Requests
                    {serviceRequests.length > 0 && (
                      <span className="badge bg-danger ms-1 rounded-pill">{serviceRequests.length}</span>
                    )}
                  </button>
                  <button
                    className={`nav-link py-1 px-3 fw-semibold small ${techTab === 'assigned' ? 'active shadow-sm' : 'text-secondary'}`}
                    onClick={() => setTechTab('assigned')}
                  >
                    <i className="bi bi-briefcase me-1"></i>
                    Active Jobs
                    {assignedJobs.length > 0 && (
                      <span className="badge bg-primary ms-1 rounded-pill">{assignedJobs.length}</span>
                    )}
                  </button>
                  <button
                    className={`nav-link py-1 px-3 fw-semibold small ${techTab === 'profile' ? 'active shadow-sm' : 'text-secondary'}`}
                    onClick={() => setTechTab('profile')}
                  >
                    <i className="bi bi-person-badge me-1"></i>
                    My Profile
                  </button>
                </div>
              </div>

              <div className="card-body p-4">
                {/* Feedback Notification Banner */}
                {actionFeedback.message && (
                  <div className={`alert alert-${actionFeedback.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4`} role="alert">
                    <i className={`bi ${actionFeedback.type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'} fs-5`}></i>
                    <div>{actionFeedback.message}</div>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setActionFeedback({ type: '', message: '' })}
                    ></button>
                  </div>
                )}

                {/* TAB 1: INCOMING SERVICE REQUESTS */}
                {techTab === 'requests' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div>
                        <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                          <span>Recommended Service Requests</span>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill small">
                            Intelligent Matching
                          </span>
                        </h5>
                        <p className="text-muted small mb-0">
                          Incoming customer complaints matched to your trade, location, and schedule
                        </p>
                      </div>

                      <button
                        onClick={fetchTechnicianData}
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        disabled={loadingRequests}
                      >
                        <i className={`bi bi-arrow-clockwise ${loadingRequests ? 'spin' : ''}`}></i>
                        <span>Refresh</span>
                      </button>
                    </div>

                    {loadingRequests ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="text-muted mt-2 small">Scanning for matching customer requests...</p>
                      </div>
                    ) : serviceRequests.length === 0 ? (
                      <div className="card bg-light border-0 rounded-4 text-center py-5">
                        <div className="card-body">
                          <i className="bi bi-check2-circle text-success fs-1 mb-2 d-block"></i>
                          <h6 className="fw-bold text-dark mb-1">No Pending Requests Available</h6>
                          <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '420px' }}>
                            All service complaints in your coverage area have either been accepted or none are pending right now. New requests will appear here automatically.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {serviceRequests.map((request) => {
                          const rec = request.recommendation || {};
                          const breakdown = rec.score_breakdown || {};
                          const isBreakdownOpen = Boolean(expandedBreakdowns[request.id]);

                          return (
                            <div className="card shadow-sm border rounded-4 overflow-hidden" key={request.id}>
                              {/* Request Card Header */}
                              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-light text-primary border font-monospace">
                                    {request.booking_reference}
                                  </span>
                                  {getUrgencyBadge(request.urgency_level)}
                                  <span className="badge bg-secondary-subtle text-dark border">
                                    <i className={`bi ${request.service_icon || 'bi-tools'} me-1`}></i>
                                    {request.service_name}
                                  </span>
                                  {request.booking_status === 'customer_selected_technician' && (
                                    <span className="badge bg-primary text-white border">
                                      <i className="bi bi-person-check-fill me-1"></i> Customer Selected You
                                    </span>
                                  )}
                                </div>

                                {/* Intelligent Recommendation Badge */}
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-success text-white px-2 py-1 shadow-sm">
                                    <i className="bi bi-stars me-1"></i>
                                    {rec.match_score || 90}% Match {rec.is_top_recommendation && '• Top Pick'}
                                  </span>
                                </div>
                              </div>

                              {/* Request Card Body */}
                              <div className="card-body p-3 p-md-4">
                                <div className="mb-3">
                                  <h5 className="fw-bold text-dark mb-1">{request.problem_title}</h5>
                                  <p className="text-secondary small mb-0">{request.problem_description}</p>
                                </div>

                                {/* Service Details Grid */}
                                <div className="p-3 bg-light rounded-3 border mb-3">
                                  <div className="row g-2 small">
                                    <div className="col-12 col-sm-6">
                                      <span className="text-muted d-block">Scheduled Appointment:</span>
                                      <strong className="text-dark">
                                        <i className="bi bi-calendar3 me-1 text-primary"></i>
                                        {new Date(request.scheduled_date).toLocaleDateString('en-IN', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </strong>
                                      <span className="d-block text-secondary">
                                        <i className="bi bi-clock me-1 text-primary"></i>
                                        {request.scheduled_time_slot}
                                      </span>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                      <span className="text-muted d-block">Customer & Contact:</span>
                                      <strong className="text-dark">
                                        <i className="bi bi-person me-1 text-primary"></i>
                                        {request.customer_name}
                                      </strong>
                                      <span className="d-block text-secondary">
                                        <i className="bi bi-telephone me-1 text-primary"></i>
                                        +91 {request.customer_phone}
                                      </span>
                                    </div>

                                    <div className="col-12 pt-2 mt-2 border-top">
                                      <span className="text-muted d-block">Service Address:</span>
                                      <span className="text-dark">
                                        <i className="bi bi-geo-alt me-1 text-danger"></i>
                                        {request.service_address}, {request.city} - {request.pincode}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Attached Problem Photo (if available) */}
                                {request.problem_image_url && (
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className="small text-muted">Problem Photo Attachment:</span>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                                      onClick={() => setPreviewPhotoUrl(request.problem_image_url)}
                                    >
                                      <i className="bi bi-image"></i>
                                      <span>View Attachment</span>
                                    </button>
                                  </div>
                                )}

                                {/* Match Score Breakdown Toggle */}
                                <div className="mb-3">
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm text-decoration-none p-0 d-flex align-items-center gap-1"
                                    onClick={() => toggleBreakdown(request.id)}
                                  >
                                    <i className={`bi ${isBreakdownOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    <span className="fw-semibold">
                                      {isBreakdownOpen ? 'Hide Recommendation Score Details' : 'View Intelligent Recommendation Match Breakdown'}
                                    </span>
                                  </button>

                                  {isBreakdownOpen && (
                                    <div className="mt-2 p-3 bg-white border rounded-3 small shadow-sm">
                                      <h6 className="fw-bold mb-2 text-dark small">
                                        Recommendation Match Weights:
                                      </h6>
                                      <div className="row g-2">
                                        <div className="col-6 col-md-4">
                                          <span className="text-muted d-block">Location Match</span>
                                          <strong>{breakdown.location_score || 0} / 30 pts</strong>
                                        </div>
                                        <div className="col-6 col-md-4">
                                          <span className="text-muted d-block">Availability Status</span>
                                          <strong>{breakdown.availability_score || 0} / 20 pts</strong>
                                        </div>
                                        <div className="col-6 col-md-4">
                                          <span className="text-muted d-block">Technician Rating</span>
                                          <strong>{breakdown.rating_score || 0} / 20 pts</strong>
                                        </div>
                                        <div className="col-6 col-md-4">
                                          <span className="text-muted d-block">Experience</span>
                                          <strong>{breakdown.experience_score || 0} / 15 pts</strong>
                                        </div>
                                        <div className="col-6 col-md-4">
                                          <span className="text-muted d-block">Visiting Fee Rate</span>
                                          <strong>{breakdown.fee_score || 0} / 15 pts</strong>
                                        </div>
                                        <div className="col-6 col-md-4">
                                          <span className="text-muted d-block">Total Match Score</span>
                                          <strong className="text-success">{rec.match_score || 0} / 100%</strong>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Financials & Action Buttons */}
                                <div className="d-flex justify-content-between align-items-center pt-3 border-top flex-wrap gap-2">
                                  <div>
                                    <span className="text-muted small d-block">Estimated Visiting & Service Fee</span>
                                    <strong className="text-primary fs-5">₹{request.estimated_cost}</strong>
                                  </div>

                                  <div className="d-flex gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm px-3 d-flex align-items-center gap-1"
                                      onClick={() => setRejectingBooking(request)}
                                      disabled={actionLoadingId === request.id}
                                    >
                                      <i className="bi bi-x-circle"></i>
                                      <span>Decline / Reject</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-success btn-sm px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                                      onClick={() => handleAccept(request.id, request.booking_reference)}
                                      disabled={actionLoadingId === request.id}
                                    >
                                      {actionLoadingId === request.id ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                          <span>Accepting...</span>
                                        </>
                                      ) : (
                                        <>
                                          <i className="bi bi-check2-circle"></i>
                                          <span>Accept Service Request</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ACCEPTED / ACTIVE JOBS */}
                {techTab === 'assigned' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div>
                        <h5 className="fw-bold mb-0 text-dark">Accepted & Active Jobs</h5>
                        <p className="text-muted small mb-0">Service jobs currently assigned to you</p>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        {/* Status Filter Buttons */}
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            type="button"
                            className={`btn ${jobStatusFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                            onClick={() => setJobStatusFilter('all')}
                          >
                            All ({assignedJobs.length})
                          </button>
                          <button
                            type="button"
                            className={`btn ${jobStatusFilter === 'accepted' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setJobStatusFilter('accepted')}
                          >
                            Accepted ({assignedJobs.filter((j) => j.booking_status === 'accepted').length})
                          </button>
                          <button
                            type="button"
                            className={`btn ${jobStatusFilter === 'in_progress' ? 'btn-info text-dark' : 'btn-outline-info text-dark'}`}
                            onClick={() => setJobStatusFilter('in_progress')}
                          >
                            In Progress ({assignedJobs.filter((j) => j.booking_status === 'in_progress').length})
                          </button>
                          <button
                            type="button"
                            className={`btn ${jobStatusFilter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => setJobStatusFilter('completed')}
                          >
                            Completed ({assignedJobs.filter((j) => j.booking_status === 'completed').length})
                          </button>
                        </div>

                        <button
                          onClick={fetchTechnicianData}
                          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                          disabled={loadingJobs}
                        >
                          <i className={`bi bi-arrow-clockwise ${loadingJobs ? 'spin' : ''}`}></i>
                          <span>Refresh</span>
                        </button>
                      </div>
                    </div>

                    {loadingJobs ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="text-muted mt-2 small">Loading your assigned jobs...</p>
                      </div>
                    ) : assignedJobs.length === 0 ? (
                      <div className="card bg-light border-0 rounded-4 text-center py-5">
                        <div className="card-body">
                          <i className="bi bi-clipboard text-muted fs-1 mb-2 d-block"></i>
                          <h6 className="fw-bold text-dark mb-1">No Active Jobs Yet</h6>
                          <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '400px' }}>
                            You currently do not have any accepted service appointments. Go to "Service Requests" to review and accept incoming customer complaints.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {assignedJobs
                          .filter((job) => {
                            if (jobStatusFilter === 'accepted') return job.booking_status === 'accepted';
                            if (jobStatusFilter === 'in_progress') return job.booking_status === 'in_progress';
                            if (jobStatusFilter === 'completed') return job.booking_status === 'completed';
                            return true;
                          })
                          .map((job) => (
                            <div className="card shadow-sm border rounded-4 overflow-hidden" key={job.id}>
                              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-light text-primary border font-monospace">
                                    {job.booking_reference}
                                  </span>
                                  {getUrgencyBadge(job.urgency_level)}
                                  <span className="badge bg-secondary-subtle text-dark border">
                                    <i className={`bi ${job.service_icon || 'bi-tools'} me-1`}></i>
                                    {job.service_name}
                                  </span>
                                </div>
                                <div>{getStatusBadge(job.booking_status)}</div>
                              </div>

                              <div className="card-body p-3 p-md-4">
                                <h5 className="fw-bold text-dark mb-1">{job.problem_title}</h5>
                                <p className="text-secondary small mb-3">{job.problem_description}</p>

                                <div className="p-3 bg-light rounded-3 border mb-3">
                                  <div className="row g-2 small">
                                    <div className="col-12 col-sm-6">
                                      <span className="text-muted d-block">Scheduled Slot:</span>
                                      <strong className="text-dark">
                                        <i className="bi bi-calendar3 me-1 text-primary"></i>
                                        {new Date(job.scheduled_date).toLocaleDateString('en-IN', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </strong>
                                      <span className="d-block text-secondary">
                                        <i className="bi bi-clock me-1 text-primary"></i>
                                        {job.scheduled_time_slot}
                                      </span>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                      <span className="text-muted d-block">Customer Details:</span>
                                      <strong className="text-dark">
                                        <i className="bi bi-person me-1 text-primary"></i>
                                        {job.customer_name}
                                      </strong>
                                      <span className="d-block">
                                        <a href={`tel:${job.customer_phone}`} className="text-decoration-none">
                                          <i className="bi bi-telephone-fill me-1 text-success"></i>
                                          +91 {job.customer_phone}
                                        </a>
                                      </span>
                                    </div>

                                    <div className="col-12 pt-2 mt-2 border-top">
                                      <span className="text-muted d-block">Customer Address:</span>
                                      <span className="text-dark">
                                        <i className="bi bi-geo-alt me-1 text-danger"></i>
                                        {job.service_address}, {job.city} - {job.pincode}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* MODULE 4 STEP 1: SERVICE LIFECYCLE ACTION PANELS */}

                                {/* 1. ACCEPTED: Show "Start Service" */}
                                {job.booking_status === 'accepted' && (
                                  <div className="p-3 bg-primary-subtle border border-primary-subtle rounded-3 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div>
                                      <strong className="text-primary d-block">
                                        <i className="bi bi-play-circle-fill me-1"></i> Ready to Begin Service
                                      </strong>
                                      <small className="text-muted">
                                        Click "Start Service" when you arrive at the customer location and begin the repair.
                                      </small>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                                      onClick={() => handleStartService(job.id, job.booking_reference)}
                                      disabled={actionLoadingId === job.id}
                                    >
                                      {actionLoadingId === job.id ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                          <span>Starting Service...</span>
                                        </>
                                      ) : (
                                        <>
                                          <i className="bi bi-play-fill fs-6"></i>
                                          <span>Start Service</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}

                                {/* 2. IN PROGRESS: Show service notes field and "Mark Completed" */}
                                {job.booking_status === 'in_progress' && (
                                  <div className="p-3 bg-info-subtle border border-info-subtle rounded-3 mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="spinner-grow spinner-grow-sm text-info" role="status"></span>
                                        <strong className="text-dark">Service Currently In Progress</strong>
                                      </div>
                                      <span className="badge bg-info text-dark">Active Job</span>
                                    </div>
                                    <div className="mb-2">
                                      <label className="form-label small fw-semibold text-muted mb-1">
                                        Service Notes (Record summary of work done, parts replaced, or findings):
                                      </label>
                                      <textarea
                                        className="form-control form-control-sm"
                                        rows="2"
                                        placeholder="e.g., Repaired pipe leak, replaced washer and tested water flow. Everything working properly."
                                        value={serviceNotes[job.id] !== undefined ? serviceNotes[job.id] : (job.service_notes || '')}
                                        onChange={(e) =>
                                          setServiceNotes({ ...serviceNotes, [job.id]: e.target.value })
                                        }
                                      ></textarea>
                                    </div>
                                    <div className="d-flex justify-content-end">
                                      <button
                                        type="button"
                                        className="btn btn-success btn-sm px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                                        onClick={() => handleCompleteService(job.id, job.booking_reference)}
                                        disabled={actionLoadingId === job.id}
                                      >
                                        {actionLoadingId === job.id ? (
                                          <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                            <span>Completing Service...</span>
                                          </>
                                        ) : (
                                          <>
                                            <i className="bi bi-check2-circle fs-6"></i>
                                            <span>Mark Completed</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* 3. COMPLETED: Show completed status, completion time, and service notes */}
                                {job.booking_status === 'completed' && (
                                  <div className="p-3 bg-success-subtle border border-success-subtle rounded-3 mb-3">
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                      <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-check2-all text-success fs-5"></i>
                                        <strong className="text-success-emphasis">Service Completed</strong>
                                      </div>
                                      {job.completed_at && (
                                        <span className="text-muted small">
                                          <i className="bi bi-clock-history me-1"></i>
                                          Completed on:{' '}
                                          {new Date(job.completed_at).toLocaleString('en-IN', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                          })}
                                        </span>
                                      )}
                                    </div>
                                    {job.service_notes && (
                                      <div className="bg-white p-2 rounded border mt-2 small">
                                        <strong className="text-dark d-block">
                                          <i className="bi bi-journal-text me-1 text-primary"></i>
                                          Technician Service Notes:
                                        </strong>
                                        <span className="text-secondary">{job.service_notes}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                  <div>
                                    <span className="text-muted small d-block">
                                      {job.booking_status === 'completed' ? 'Final Service Fee' : 'Estimated Fee'}
                                    </span>
                                    <strong className="text-primary fs-5">
                                      ₹{job.final_cost || job.estimated_cost}
                                    </strong>
                                  </div>

                                  <div className="d-flex gap-2">
                                    {job.problem_image_url && (
                                      <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                                        onClick={() => setPreviewPhotoUrl(job.problem_image_url)}
                                      >
                                        <i className="bi bi-image"></i>
                                        <span>Photo</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                      onClick={() => handleViewTimeline(job.id)}
                                    >
                                      <i className="bi bi-clock-history"></i>
                                      <span>Lifecycle History</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: TECHNICIAN PROFILE */}
                {techTab === 'profile' && (
                  <div>
                    <h5 className="fw-bold mb-3 text-dark">Technician Credentials & Profile</h5>
                    {technicianProfile ? (
                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <div className="p-3 bg-light rounded-3 border">
                            <span className="text-muted small d-block">Specialization</span>
                            <strong className="fs-6 text-dark">{technicianProfile.service_name || 'Home Repairs'}</strong>
                          </div>
                        </div>
                        <div className="col-12 col-sm-6">
                          <div className="p-3 bg-light rounded-3 border">
                            <span className="text-muted small d-block">Experience</span>
                            <strong className="fs-6 text-dark">{technicianProfile.experience_years} Years</strong>
                          </div>
                        </div>
                        <div className="col-12 col-sm-6">
                          <div className="p-3 bg-light rounded-3 border">
                            <span className="text-muted small d-block">Hourly Rate / Visiting Fee</span>
                            <strong className="fs-6 text-dark">
                              ₹{technicianProfile.hourly_rate} / ₹{technicianProfile.visiting_charges}
                            </strong>
                          </div>
                        </div>
                        <div className="col-12 col-sm-6">
                          <div className="p-3 bg-light rounded-3 border">
                            <span className="text-muted small d-block">Average Rating</span>
                            <strong className="fs-6 text-warning">
                              <i className="bi bi-star-fill me-1"></i>
                              {technicianProfile.average_rating || '5.0'} / 5.0
                            </strong>
                          </div>
                        </div>
                        {technicianProfile.service_area && (
                          <div className="col-12">
                            <div className="p-3 bg-light rounded-3 border">
                              <span className="text-muted small d-block">Service Coverage Area</span>
                              <span className="fw-semibold text-dark">{technicianProfile.service_area}</span>
                            </div>
                          </div>
                        )}
                        {technicianProfile.bio && (
                          <div className="col-12">
                            <div className="p-3 bg-light rounded-3 border">
                              <span className="text-muted small d-block">Bio / Skills</span>
                              <span className="text-secondary small">{technicianProfile.bio}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted">Technician profile details are loaded.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADMIN WORKSPACE */}
          {user.role === 'admin' && (
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-shield-lock-fill text-danger"></i>
                  <span>Administrator Command Center</span>
                </h5>
              </div>
              <div className="card-body p-4">
                <p className="text-muted mb-4">
                  Full system oversight: manage user accounts, verify new technician registrations, monitor service category pricing, and review system audit logs.
                </p>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-danger mb-2">
                        <i className="bi bi-person-check fs-4"></i>
                        <h6 className="fw-bold mb-0">Technician Approvals</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Review pending applications, inspect credentials, and verify technicians.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-primary mb-2">
                        <i className="bi bi-people fs-4"></i>
                        <h6 className="fw-bold mb-0">User Directory</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Manage registered customers and account statuses.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-success mb-2">
                        <i className="bi bi-journal-check fs-4"></i>
                        <h6 className="fw-bold mb-0">Audit Logs</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Inspect admin actions logged in MySQL admin_logs table.
                      </p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-warning mb-2">
                        <i className="bi bi-sliders fs-4"></i>
                        <h6 className="fw-bold mb-0">Service Categories</h6>
                      </div>
                      <p className="text-muted small mb-0">
                        Update baseline service rates, icons, and availability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REJECT CONFIRMATION MODAL */}
      {rejectingBooking && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">Decline Service Request</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setRejectingBooking(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted mb-3">
                  Are you sure you want to decline request{' '}
                  <strong className="text-dark">{rejectingBooking.booking_reference}</strong>? Declining will allow the recommendation system to offer this request to another qualified technician.
                </p>

                <label className="form-label fw-semibold small text-muted">Reason for Declining:</label>
                <select
                  className="form-select mb-3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="Schedule conflict">Schedule conflict</option>
                  <option value="Cannot reach location">Cannot reach location</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Other">Other</option>
                </select>

                {rejectReason === 'Other' && (
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Please specify reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  ></textarea>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setRejectingBooking(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4 fw-semibold"
                  onClick={handleConfirmReject}
                  disabled={actionLoadingId === rejectingBooking.id}
                >
                  {actionLoadingId === rejectingBooking.id ? 'Declining...' : 'Confirm Decline'}
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
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-transparent border-0 text-center">
              <img
                src={previewPhotoUrl}
                alt="Problem Attachment"
                className="img-fluid rounded-3 shadow-lg mx-auto"
                style={{ maxHeight: '80vh' }}
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-light btn-sm px-4 fw-semibold"
                  onClick={() => setPreviewPhotoUrl(null)}
                >
                  Close Photo Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE MODAL FOR ACTIVE JOBS */}
      {selectedTimelineBooking && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header bg-light border-bottom">
                <h5 className="modal-title fw-bold">
                  Job Timeline: {selectedTimelineBooking.booking.booking_reference}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedTimelineBooking(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6">
                    <span className="text-muted small d-block">Service Problem</span>
                    <strong className="fs-6">{selectedTimelineBooking.booking.problem_title}</strong>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted small d-block">Status</span>
                    {getStatusBadge(selectedTimelineBooking.booking.booking_status)}
                  </div>
                </div>

                <h6 className="fw-bold mb-3 border-start border-3 border-primary ps-2">
                  Service Audit Logs
                </h6>
                <ul className="list-group list-group-flush border rounded-3">
                  {selectedTimelineBooking.statusHistory?.map((log, idx) => (
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
                  onClick={() => setSelectedTimelineBooking(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
