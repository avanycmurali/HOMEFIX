import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyBookingsApi, submitBookingReviewApi } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { CardSkeleton } from '../components/LoadingSkeleton.jsx';

export default function ServiceHistory() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('completed'); // 'completed' | 'all_past'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Rating Modal
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'user') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    const res = await getMyBookingsApi(token);
    if (res.ok && res.data.success) {
      setBookings(res.data.data || []);
    } else {
      setError(res.data?.message || 'Failed to load service history.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleOpenReview = (booking) => {
    setReviewingBooking(booking);
    setReviewRating(booking.customer_rating || 5);
    setReviewComment(booking.customer_review || '');
  };

  const handleSubmitReview = async () => {
    if (!reviewingBooking) return;
    setSubmittingReview(true);
    const res = await submitBookingReviewApi(
      reviewingBooking.id,
      { rating: reviewRating, review_comment: reviewComment },
      token
    );
    setSubmittingReview(false);

    if (res.ok && res.data?.success) {
      setReviewingBooking(null);
      setReviewSuccessMsg('Thank you! Your feedback has been recorded.');
      setTimeout(() => setReviewSuccessMsg(''), 4000);
      fetchHistory();
    } else {
      alert(res.data?.message || 'Failed to submit review.');
    }
  };

  // Past services: completed or cancelled
  const completedList = bookings.filter((b) => b.booking_status === 'completed');
  const pastList = bookings.filter((b) =>
    ['completed', 'cancelled', 'rejected'].includes(b.booking_status)
  );

  const displayedList = (filter === 'completed' ? completedList : pastList).filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.service_name?.toLowerCase().includes(q) ||
      b.booking_reference?.toLowerCase().includes(q) ||
      b.technician_name?.toLowerCase().includes(q) ||
      b.problem_title?.toLowerCase().includes(q)
    );
  });

  const totalSpent = completedList.reduce((acc, b) => {
    const amt = parseFloat(b.final_amount || b.total_amount || b.service_base_price || 0);
    return acc + (isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div className="py-5" style={{ backgroundColor: '#FAF7F2', minHeight: '85vh' }}>
      <div className="container">
        {/* Header */}
        <div
          className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom"
          style={{ borderColor: '#D8C7B5' }}
        >
          <div>
            <span
              className="badge px-3 py-1 small fw-semibold mb-2"
              style={{
                backgroundColor: '#F5EFE6',
                color: '#5A3E2B',
                border: '1px solid #D8C7B5',
                borderRadius: '4px',
              }}
            >
              <i className="bi bi-clock-history me-1" style={{ color: '#5A3E2B' }}></i> Service History
            </span>
            <h3 className="fw-bold mb-1" style={{ color: '#3E3027' }}>
              Service History
            </h3>
            <p className="small mb-0" style={{ color: '#4A382C' }}>
              A simple and clear record of your completed home services, technicians, and payments.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              onClick={fetchHistory}
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
              style={{ borderColor: '#D8C7B5', color: '#3E3027' }}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
              <span>Refresh</span>
            </button>
            <Link to="/my-bookings" className="btn btn-outline-primary btn-sm px-3">
              <i className="bi bi-card-checklist me-1"></i> Active Bookings
            </Link>
          </div>
        </div>

        {/* Success Alert */}
        {reviewSuccessMsg && (
          <div
            className="alert alert-dismissible fade show mb-4 d-flex align-items-center gap-2"
            style={{
              backgroundColor: '#EAF2E8',
              borderColor: '#C8D7C4',
              color: '#3B5233',
              borderRadius: '6px',
            }}
            role="alert"
          >
            <i className="bi bi-check-circle-fill fs-5" style={{ color: '#5F7654' }}></i>
            <div>{reviewSuccessMsg}</div>
            <button type="button" className="btn-close" onClick={() => setReviewSuccessMsg('')}></button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}

        {/* Quick Summary Strip */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-md-4">
            <div
              className="p-3 border d-flex align-items-center gap-3"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '6px',
                  backgroundColor: '#EAF2E8',
                  color: '#3B5233',
                  fontSize: '1.25rem',
                }}
              >
                <i className="bi bi-check2-circle"></i>
              </div>
              <div>
                <span className="small text-muted d-block">Completed Services</span>
                <h5 className="fw-bold mb-0" style={{ color: '#3E3027' }}>
                  {completedList.length}
                </h5>
              </div>
            </div>
          </div>

          <div className="col-sm-6 col-md-4">
            <div
              className="p-3 border d-flex align-items-center gap-3"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '6px',
                  backgroundColor: '#F5EFE6',
                  color: '#5A3E2B',
                  fontSize: '1.25rem',
                }}
              >
                <i className="bi bi-cash-stack"></i>
              </div>
              <div>
                <span className="small text-muted d-block">Total Amount Spent</span>
                <h5 className="fw-bold mb-0" style={{ color: '#3E3027' }}>
                  ₹{totalSpent.toFixed(2)}
                </h5>
              </div>
            </div>
          </div>

          <div className="col-sm-12 col-md-4">
            <div
              className="p-3 border d-flex align-items-center gap-3"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '6px',
                  backgroundColor: '#FAF5EE',
                  color: '#7D5224',
                  fontSize: '1.25rem',
                }}
              >
                <i className="bi bi-calendar2-check"></i>
              </div>
              <div>
                <span className="small text-muted d-block">Latest Service</span>
                <span className="fw-semibold small d-block text-truncate" style={{ color: '#3E3027', maxWidth: '170px' }}>
                  {completedList[0] ? completedList[0].service_name : 'No services yet'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div
          className="p-3 border mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3"
          style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
        >
          {/* Simple Tab Filters */}
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm px-3 fw-semibold"
              style={{
                backgroundColor: filter === 'completed' ? '#5A3E2B' : '#F5EFE6',
                color: filter === 'completed' ? '#FFFDF9' : '#5A3E2B',
                border: '1px solid #D8C7B5',
                borderRadius: '4px',
              }}
              onClick={() => setFilter('completed')}
            >
              Completed ({completedList.length})
            </button>
            <button
              type="button"
              className="btn btn-sm px-3 fw-semibold"
              style={{
                backgroundColor: filter === 'all_past' ? '#5A3E2B' : '#F5EFE6',
                color: filter === 'all_past' ? '#FFFDF9' : '#5A3E2B',
                border: '1px solid #D8C7B5',
                borderRadius: '4px',
              }}
              onClick={() => setFilter('all_past')}
            >
              All Past Records ({pastList.length})
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ maxWidth: '280px' }} className="w-100">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: '#D8C7B5' }}>
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                style={{ borderColor: '#D8C7B5', backgroundColor: '#FFFDF9' }}
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  style={{ borderColor: '#D8C7B5' }}
                  onClick={() => setSearchQuery('')}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : displayedList.length === 0 ? (
          <EmptyState
            icon="bi-clock-history"
            title={filter === 'completed' ? 'No Completed Services' : 'No Past Services'}
            description={
              searchQuery
                ? 'No past services matched your search query.'
                : 'You have not completed any home services yet. Book a service to get started!'
            }
            actionLabel="Book a Service"
            actionLink="/book-service"
          />
        ) : (
          <div className="d-flex flex-column gap-3">
            {displayedList.map((item) => {
              const isExpanded = expandedId === item.id;
              const formattedDate = item.scheduled_date
                ? new Date(item.scheduled_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Date N/A';
              const amount = parseFloat(
                item.final_amount || item.total_amount || item.service_base_price || 0
              ).toFixed(2);

              return (
                <div
                  key={item.id}
                  className="border shadow-xs overflow-hidden"
                  style={{
                    backgroundColor: '#FFFDF9',
                    borderColor: '#D8C7B5',
                    borderRadius: '8px',
                  }}
                >
                  {/* Main Row */}
                  <div className="p-3 p-md-4">
                    <div className="row align-items-center g-3">
                      {/* Left: Service Icon & Info */}
                      <div className="col-12 col-md-5 d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            backgroundColor: '#F5EFE6',
                            color: '#5A3E2B',
                            border: '1px solid #D8C7B5',
                            fontSize: '1.25rem',
                          }}
                        >
                          <i className={`bi ${item.service_icon || 'bi-tools'}`}></i>
                        </div>
                        <div className="text-truncate">
                          <div className="d-flex align-items-center gap-2 mb-0.5">
                            <h6 className="fw-bold mb-0 text-truncate" style={{ color: '#3E3027' }}>
                              {item.service_name}
                            </h6>
                            <StatusBadge status={item.booking_status} />
                          </div>
                          <span className="small text-muted font-monospace">
                            {item.booking_reference}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Date & Technician */}
                      <div className="col-6 col-md-4">
                        <div className="small mb-1" style={{ color: '#4A382C' }}>
                          <i className="bi bi-calendar3 me-1.5" style={{ color: '#5A3E2B' }}></i>
                          <strong>{formattedDate}</strong>
                          {item.scheduled_time_slot && (
                            <span className="text-muted ms-1">
                              ({item.scheduled_time_slot.split(' ')[0]})
                            </span>
                          )}
                        </div>
                        <div className="small text-truncate" style={{ color: '#4A382C' }}>
                          <i className="bi bi-person me-1.5" style={{ color: '#5A3E2B' }}></i>
                          {item.technician_name ? (
                            <span>Tech: <strong>{item.technician_name}</strong></span>
                          ) : (
                            <span className="text-muted">No tech assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="col-6 col-md-3 text-end d-flex flex-column align-items-end justify-content-center">
                        <div className="fs-5 fw-bold mb-1" style={{ color: '#5A3E2B' }}>
                          ₹{amount}
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                          {item.booking_status === 'completed' && (
                            item.customer_rating ? (
                              <span
                                className="badge px-2 py-1 small"
                                style={{ backgroundColor: '#FAF5EE', color: '#A9793F', border: '1px solid #D8C7B5' }}
                                title={item.customer_review || 'Reviewed'}
                              >
                                ★ {item.customer_rating}/5 Rated
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline-warning btn-sm py-0.5 px-2"
                                style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                                onClick={() => handleOpenReview(item)}
                              >
                                <i className="bi bi-star me-1"></i> Rate
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            className="btn btn-sm py-1 px-2.5"
                            style={{
                              backgroundColor: isExpanded ? '#FAF7F2' : '#F5EFE6',
                              color: '#5A3E2B',
                              borderColor: '#D8C7B5',
                              border: '1px solid #D8C7B5',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                            }}
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          >
                            {isExpanded ? 'Hide' : 'Details'} <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} ms-1`}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Simple Details */}
                  {isExpanded && (
                    <div
                      className="p-3 px-4 border-top"
                      style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
                    >
                      <div className="row g-3 small">
                        <div className="col-md-6">
                          <span className="fw-semibold d-block mb-1" style={{ color: '#3E3027' }}>
                            Problem Reported:
                          </span>
                          <p className="mb-2 text-muted">
                            <strong>{item.problem_title}</strong>
                            {item.problem_description && ` — ${item.problem_description}`}
                          </p>

                          <span className="fw-semibold d-block mb-1" style={{ color: '#3E3027' }}>
                            Service Address:
                          </span>
                          <p className="mb-0 text-muted">
                            <i className="bi bi-geo-alt me-1 text-danger"></i>
                            {item.service_address}, {item.city} - {item.pincode}
                          </p>
                        </div>

                        <div className="col-md-6 border-start-md" style={{ borderColor: '#D8C7B5' }}>
                          <span className="fw-semibold d-block mb-1" style={{ color: '#3E3027' }}>
                            Payment &amp; Billing Summary:
                          </span>
                          <ul className="list-unstyled mb-2 text-muted">
                            <li>
                              Base Service Charge: <strong>₹{parseFloat(item.service_base_price || 0).toFixed(2)}</strong>
                            </li>
                            {item.final_amount && (
                              <li>
                                Final Total Paid: <strong className="text-dark">₹{parseFloat(item.final_amount).toFixed(2)}</strong>
                              </li>
                            )}
                            <li>
                              Payment Status: <strong className="text-capitalize">{item.payment_status || 'Paid'}</strong>
                            </li>
                            {item.payment_paid_at && (
                              <li>
                                Paid Date: {new Date(item.payment_paid_at).toLocaleDateString()}
                              </li>
                            )}
                          </ul>

                          {item.customer_review && (
                            <div className="p-2 border mt-2" style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '4px' }}>
                              <span className="small fw-semibold text-warning">Your Feedback:</span>
                              <p className="small mb-0 text-dark fst-italic">"{item.customer_review}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom / Footer Navigation Area */}
        <div className="mt-5 pt-3 border-top text-start" style={{ borderColor: '#D8C7B5' }}>
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-sm hf-btn-back d-inline-flex align-items-center gap-1.5"
          >
            &larr; Back
          </button>
        </div>
      </div>

      {/* RATING & REVIEW MODAL */}
      {reviewingBooking && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(62, 48, 39, 0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border shadow-lg overflow-hidden"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div
                className="modal-header text-white py-3 px-4 border-0"
                style={{ backgroundColor: '#5A3E2B' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-star-fill fs-4" style={{ color: '#E8D8C7' }}></i>
                  <h5 className="modal-title fw-bold mb-0">Rate &amp; Review Service</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => !submittingReview && setReviewingBooking(null)}
                  disabled={submittingReview}
                ></button>
              </div>

              <div className="modal-body p-4 text-center">
                <p className="small mb-3" style={{ color: '#4A382C' }}>
                  How was your experience for{' '}
                  <strong>{reviewingBooking.service_name}</strong>
                  {reviewingBooking.technician_name && (
                    <> with <strong>{reviewingBooking.technician_name}</strong></>
                  )}?
                </p>

                <div className="d-flex justify-content-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="btn btn-link p-1 text-decoration-none fs-2"
                      onClick={() => setReviewRating(star)}
                      style={{ color: star <= reviewRating ? '#A9793F' : '#D8C7B5' }}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="text-start mb-3">
                  <label className="form-label small fw-semibold" style={{ color: '#3E3027' }}>
                    Feedback Comments:
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Share how the technician did (work quality, punctuality, satisfaction)..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div
                className="modal-footer p-3 border-top"
                style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setReviewingBooking(null)}
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-semibold px-4 shadow-xs"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
