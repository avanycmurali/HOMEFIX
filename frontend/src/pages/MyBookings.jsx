import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getMyBookingsApi,
  cancelBookingApi,
  getBookingRecommendationsApi,
  selectTechnicianApi,
  createPaymentOrderApi,
  verifyPaymentApi,
  submitBookingReviewApi,
} from '../services/api.js';
import {
  TechnicianRecommendationsList,
  TechnicianRecommendationCard,
} from '../components/TechnicianRecommendationCard.jsx';
import StatusBadge, { UrgencyBadge } from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CardSkeleton } from '../components/LoadingSkeleton.jsx';

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '5000') {
    return `http://localhost:5000${cleanPath}`;
  }
  return cleanPath;
};

export default function MyBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Recommendations modal
  const [viewingRecommendationsBooking, setViewingRecommendationsBooking] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsList, setRecommendationsList] = useState([]);

  // Technician Selection Confirmation
  const [confirmingTechnician, setConfirmingTechnician] = useState(null);
  const [confirmingBooking, setConfirmingBooking] = useState(null);
  const [selectingLoading, setSelectingLoading] = useState(false);
  const [selectionSuccessMsg, setSelectionSuccessMsg] = useState('');

  // Payment states (Demo + Razorpay)
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [paymentFeedback, setPaymentFeedback] = useState({ type: '', message: '' });
  const [demoModalData, setDemoModalData] = useState(null);
  const [demoProcessing, setDemoProcessing] = useState(false);
  const [demoMethod, setDemoMethod] = useState('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');

  // Customer Review Modal
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Photo viewer modal
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

  const handleInitiateSelectTechnician = (booking, technician) => {
    setConfirmingBooking(booking);
    setConfirmingTechnician(technician);
  };

  const handleConfirmTechnicianSelection = async () => {
    if (!confirmingBooking || !confirmingTechnician) return;
    const techId = confirmingTechnician.technicianId || confirmingTechnician.technician_id || confirmingTechnician.id;
    setSelectingLoading(true);
    const res = await selectTechnicianApi(
      confirmingBooking.id,
      techId,
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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async (booking) => {
    setPayingBookingId(booking.id);
    setPaymentFeedback({ type: '', message: '' });

    const orderRes = await createPaymentOrderApi(booking.id, token);
    if (!orderRes.ok || !orderRes.data?.success) {
      setPayingBookingId(null);
      setPaymentFeedback({
        type: 'danger',
        message: orderRes.data?.message || 'Failed to initiate payment order.',
      });
      return;
    }

    const { key_id, order_id, amount, currency, payment_mode, is_demo } = orderRes.data;

    if (payment_mode === 'demo' || is_demo) {
      setPayingBookingId(null);
      setDemoModalData({
        booking,
        orderId: order_id,
        amount: (amount / 100).toFixed(2),
        currency: currency || 'INR',
      });
      return;
    }

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      setPayingBookingId(null);
      setPaymentFeedback({
        type: 'danger',
        message: 'Could not load Razorpay payment SDK. Please verify your network connection and try again.',
      });
      return;
    }

    const options = {
      key: key_id,
      amount: amount,
      currency: currency || 'INR',
      name: 'HOMEFIX',
      description: `Payment for Booking ${booking.booking_reference}`,
      order_id: order_id,
      handler: async function (response) {
        setPaymentFeedback({ type: 'info', message: 'Verifying payment with secure backend...' });
        const verifyRes = await verifyPaymentApi(
          booking.id,
          {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
          token
        );

        setPayingBookingId(null);
        if (verifyRes.ok && verifyRes.data?.success) {
          setPaymentFeedback({
            type: 'success',
            message: `Payment successful! Transaction ID: ${response.razorpay_payment_id}`,
          });
          fetchBookings();
        } else {
          setPaymentFeedback({
            type: 'danger',
            message: verifyRes.data?.message || 'Payment signature verification failed.',
          });
        }
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#1e3a8a' },
      modal: {
        ondismiss: function () {
          setPayingBookingId(null);
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setPayingBookingId(null);
        setPaymentFeedback({
          type: 'danger',
          message: `Payment failed: ${response.error?.description || 'Transaction was not completed.'}`,
        });
      });
      rzp.open();
    } catch (err) {
      setPayingBookingId(null);
      setPaymentFeedback({
        type: 'danger',
        message: `Failed to open Razorpay checkout: ${err.message}`,
      });
    }
  };

  const handleConfirmDemoPayment = async () => {
    if (!demoModalData) return;
    setDemoProcessing(true);

    const demoTxnId = `pay_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const verifyRes = await verifyPaymentApi(
      demoModalData.booking.id,
      {
        razorpay_order_id: demoModalData.orderId,
        razorpay_payment_id: demoTxnId,
        razorpay_signature: 'demo_verified_signature',
      },
      token
    );

    setDemoProcessing(false);
    if (verifyRes.ok && verifyRes.data?.success) {
      const ref = demoModalData.booking.booking_reference;
      setDemoModalData(null);
      const upiNames = { gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm', bhim: 'BHIM UPI', cred: 'CRED' };
      const paidVia = demoMethod === 'upi' ? (upiNames[selectedUpiApp] || 'UPI') : 'Card';
      setPaymentFeedback({
        type: 'success',
        message: `Payment completed for ${ref} via ${paidVia}! Transaction ID: ${demoTxnId} (Simulated — No real money was charged).`,
      });
      fetchBookings();
    } else {
      alert(verifyRes.data?.message || 'Demo payment confirmation failed.');
    }
  };

  const handleOpenReviewModal = (booking) => {
    setReviewingBooking(booking);
    setReviewRating(5);
    setReviewComment('');
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
      setPaymentFeedback({
        type: 'success',
        message: 'Thank you! Your rating & review have been submitted successfully.',
      });
      fetchBookings();
    } else {
      alert(res.data?.message || 'Failed to submit review.');
    }
  };


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

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['pending', 'customer_selected_technician', 'technician_rejected', 'technician_assigned'].includes(b.booking_status);
    if (activeFilter === 'in_progress') return ['accepted', 'in_progress'].includes(b.booking_status);
    if (activeFilter === 'completed') return b.booking_status === 'completed';
    if (activeFilter === 'cancelled') return ['cancelled', 'rejected'].includes(b.booking_status);
    return true;
  });

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="py-5" style={{ backgroundColor: '#FAF7F2', minHeight: '85vh' }}>
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom" style={{ borderColor: '#D8C7B5' }}>
          <div>
            <span
              className="badge px-3 py-1 small fw-semibold mb-2"
              style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
            >
              <i className="bi bi-card-checklist me-1" style={{ color: '#5A3E2B' }}></i> Active Bookings
            </span>
            <h3 className="fw-bold mb-1" style={{ color: '#3E3027' }}>My Bookings</h3>
            <p className="small mb-0" style={{ color: '#4A382C' }}>
              Track active appointments, select technicians, and follow live repair progress.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              onClick={fetchBookings}
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
              style={{ borderColor: '#D8C7B5', color: '#3E3027' }}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
              <span>Refresh</span>
            </button>
            <Link to="/service-history" className="btn btn-outline-secondary btn-sm px-3" style={{ borderColor: '#D8C7B5', color: '#3E3027' }}>
              <i className="bi bi-clock-history me-1"></i> Service History
            </Link>
            <Link to="/book-service" className="btn btn-primary btn-sm px-3 shadow-xs">
              <i className="bi bi-plus-circle me-1"></i> Book a Service
            </Link>
          </div>
        </div>

        {/* Feedback Alerts */}
        {selectionSuccessMsg && (
          <div
            className="alert alert-dismissible fade show mb-4 d-flex align-items-center gap-2"
            style={{ backgroundColor: '#EAF2E8', borderColor: '#C8D7C4', color: '#3B5233', borderRadius: '6px' }}
            role="alert"
          >
            <i className="bi bi-check-circle-fill fs-5" style={{ color: '#5F7654' }}></i>
            <div>{selectionSuccessMsg}</div>
            <button type="button" className="btn-close" onClick={() => setSelectionSuccessMsg('')}></button>
          </div>
        )}

        {paymentFeedback.message && (
          <div
            className="alert alert-dismissible fade show mb-4 d-flex align-items-center gap-2"
            style={{
              backgroundColor: paymentFeedback.type === 'success' ? '#EAF2E8' : '#FAF0EE',
              borderColor: paymentFeedback.type === 'success' ? '#C8D7C4' : '#E6BFB8',
              color: paymentFeedback.type === 'success' ? '#3B5233' : '#7A3328',
              borderRadius: '6px',
            }}
            role="alert"
          >
            <i
              className={`bi ${paymentFeedback.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5`}
              style={{ color: paymentFeedback.type === 'success' ? '#5F7654' : '#9A4F43' }}
            ></i>
            <div>{paymentFeedback.message}</div>
            <button type="button" className="btn-close" onClick={() => setPaymentFeedback({ type: '', message: '' })}></button>
          </div>
        )}

        {/* Filter Tabs */}
        <div
          className="d-flex p-1 border mb-4 overflow-auto gap-1"
          style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '6px' }}
          role="tablist"
        >
          {[
            { key: 'all', label: 'All Bookings', count: bookings.length },
            {
              key: 'pending',
              label: 'Pending & Waiting',
              count: bookings.filter((b) => ['pending', 'customer_selected_technician', 'technician_rejected', 'technician_assigned'].includes(b.booking_status)).length,
            },
            {
              key: 'in_progress',
              label: 'Active & In Progress',
              count: bookings.filter((b) => ['accepted', 'in_progress'].includes(b.booking_status)).length,
            },
            {
              key: 'completed',
              label: 'Completed Services',
              count: bookings.filter((b) => b.booking_status === 'completed').length,
            },
            {
              key: 'cancelled',
              label: 'Cancelled',
              count: bookings.filter((b) => ['cancelled', 'rejected'].includes(b.booking_status)).length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              className="btn btn-sm py-2 px-3 fw-semibold border-0 text-nowrap"
              style={{
                backgroundColor: activeFilter === tab.key ? '#5A3E2B' : 'transparent',
                color: activeFilter === tab.key ? '#FFFDF9' : '#4A382C',
                borderRadius: '4px',
              }}
              onClick={() => setActiveFilter(tab.key)}
            >
              <span>{tab.label}</span>
              <span
                className="badge ms-1.5"
                style={{
                  backgroundColor: activeFilter === tab.key ? '#E8D8C7' : '#F5EFE6',
                  color: activeFilter === tab.key ? '#5A3E2B' : '#4A382C',
                  border: activeFilter === tab.key ? 'none' : '1px solid #D8C7B5',
                  borderRadius: '4px',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon="bi-calendar2-x"
            title="No Bookings Found"
            description={
              activeFilter === 'all'
                ? 'You have not registered any home service requests yet.'
                : `There are currently no bookings in the "${activeFilter}" category.`
            }
            actionLabel="Book a Service Now"
            actionLink="/book-service"
          />
        ) : (
          /* Status-Based Booking Cards Grid */
          <div className="row g-4">
            {filteredBookings.map((booking) => (
              <div className="col-12 col-lg-6" key={booking.id}>
                <div
                  className="card h-100 d-flex flex-column border shadow-sm"
                  style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
                >
                  {/* Header */}
                  <div
                    className="p-3 px-4 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2"
                    style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="badge font-monospace fw-bold"
                        style={{ backgroundColor: '#FFFDF9', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
                      >
                        {booking.booking_reference}
                      </span>
                      <UrgencyBadge urgency={booking.urgency_level} />
                    </div>
                    <div>
                      <StatusBadge status={booking.booking_status} />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-grow-1">
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          fontSize: '1.25rem',
                          backgroundColor: '#F5EFE6',
                          color: '#5A3E2B',
                          border: '1px solid #D8C7B5',
                        }}
                      >
                        <i className={`bi ${booking.service_icon || 'bi-tools'}`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <span className="small fw-semibold text-uppercase d-block mb-0.5" style={{ color: '#4A382C', fontSize: '0.75rem' }}>
                          {booking.service_name}
                        </span>
                        <h5 className="fw-bold mb-1" style={{ color: '#3E3027' }}>{booking.problem_title}</h5>
                        <p className="small mb-0 text-truncate" style={{ maxWidth: '340px', color: '#4A382C' }}>
                          {booking.problem_description}
                        </p>
                      </div>
                    </div>

                    {/* Schedule & Address Box */}
                    <div
                      className="p-3 border mb-3"
                      style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                    >
                      <div className="row g-2 small">
                        <div className="col-6">
                          <span className="d-block" style={{ color: '#4A382C' }}>Scheduled Visit:</span>
                          <strong style={{ color: '#3E3027' }}>
                            <i className="bi bi-calendar3 me-1" style={{ color: '#5A3E2B' }}></i>
                            {new Date(booking.scheduled_date).toLocaleDateString()}
                          </strong>
                        </div>
                        <div className="col-6">
                          <span className="d-block" style={{ color: '#4A382C' }}>Slot:</span>
                          <span className="fw-medium text-truncate d-block" style={{ color: '#3E3027' }}>
                            <i className="bi bi-clock me-1" style={{ color: '#5A3E2B' }}></i>
                            {booking.scheduled_time_slot.split(' ')[0]}
                          </span>
                        </div>
                        <div className="col-12 pt-2 mt-2 border-top" style={{ borderColor: '#D8C7B5' }}>
                          <span className="d-block" style={{ color: '#4A382C' }}>Service Address:</span>
                          <span className="text-truncate d-block" style={{ color: '#3E3027' }}>
                            <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                            {booking.service_address}, {booking.city} - {booking.pincode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Context-Aware Status Banner */}
                    {/* Case A: Customer Selected Technician (Waiting) */}
                    {booking.booking_status === 'customer_selected_technician' && (
                      <div
                        className="p-3 border mb-3"
                        style={{ backgroundColor: '#FAF5EE', borderColor: '#E6D4BD', color: '#7D5224', borderRadius: '6px' }}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 pb-2 border-bottom" style={{ borderColor: '#E6D4BD' }}>
                          <div className="d-flex align-items-center gap-2">
                            <span className="spinner-grow spinner-grow-sm text-warning" role="status"></span>
                            <strong className="small">Waiting for technician confirmation</strong>
                          </div>
                          <span
                            className="badge"
                            style={{ backgroundColor: '#E8D8C7', color: '#5A3E2B', borderRadius: '4px' }}
                          >
                            Selection Sent
                          </span>
                        </div>
                        <div className="small">
                          <span className="d-block" style={{ color: '#7D5224' }}>Selected Technician:</span>
                          <strong className="fs-6" style={{ color: '#3E3027' }}>
                            {booking.selected_technician?.technicianName || booking.technician_name || 'Selected Specialist'}
                          </strong>
                          <span className="ms-2" style={{ color: '#4A382C' }}>
                            ({booking.selected_technician?.matchScore || 90}% match)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Case B: Technician Rejected */}
                    {booking.booking_status === 'technician_rejected' && (
                      <div
                        className="p-3 border mb-3"
                        style={{ backgroundColor: '#FAF0EE', borderColor: '#E6BFB8', color: '#7A3328', borderRadius: '6px' }}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                          <strong className="small d-flex align-items-center gap-1" style={{ color: '#9A4F43' }}>
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <span>Technician was unavailable — Select Alternative</span>
                          </strong>
                        </div>
                        <p className="small mb-2" style={{ color: '#4A382C' }}>
                          Reason: {booking.rejection_reason || 'Schedule conflict or location outside radius.'}
                        </p>
                        <button
                          type="button"
                          className="btn btn-sm px-3 shadow-xs text-white"
                          style={{ backgroundColor: '#9A4F43', borderRadius: '4px' }}
                          onClick={() => handleOpenRecommendations(booking)}
                        >
                          <i className="bi bi-people-fill me-1"></i> Choose Another Technician
                        </button>
                      </div>
                    )}

                    {/* Case C: Confirmed Technician or Completed */}
                    {booking.technician_name && !['customer_selected_technician', 'technician_rejected'].includes(booking.booking_status) && (
                      <div
                        className="p-3 border mb-3"
                        style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 pb-2 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="d-flex align-items-center justify-content-center text-white fw-bold small flex-shrink-0"
                              style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#5A3E2B' }}
                            >
                              {booking.technician_name.charAt(0)}
                            </div>
                            <div>
                              <strong className="d-block leading-tight" style={{ color: '#3E3027' }}>{booking.technician_name}</strong>
                              <small style={{ color: '#4A382C' }}>
                                <i className="bi bi-telephone me-1" style={{ color: '#5F7654' }}></i> +91 {booking.technician_phone}
                              </small>
                            </div>
                          </div>
                          <div className="text-end">
                            <span
                              className="badge"
                              style={{ backgroundColor: '#FFFDF9', color: '#3E3027', border: '1px solid #D8C7B5', borderRadius: '4px' }}
                            >
                              ★ {booking.technician_rating || '5.0'}
                            </span>
                          </div>
                        </div>

                        {/* If Completed, show Payment Action */}
                        {booking.booking_status === 'completed' && (
                          <div className="pt-1">
                            {booking.payment_status === 'paid' ? (
                              <div
                                className="alert d-flex align-items-center justify-content-between p-2 px-3 mb-2"
                                style={{ backgroundColor: '#EAF2E8', borderColor: '#C8D7C4', color: '#3B5233', borderRadius: '6px' }}
                              >
                                <div className="d-flex align-items-center gap-2 small">
                                  <i className="bi bi-patch-check-fill fs-5" style={{ color: '#5F7654' }}></i>
                                  <div>
                                    <strong style={{ color: '#3B5233' }}>Payment Settled</strong>
                                    <small className="d-block font-monospace" style={{ fontSize: '0.7rem', color: '#526E49' }}>
                                      Txn: {booking.razorpay_payment_id || 'DEMO-VERIFIED'}
                                    </small>
                                  </div>
                                </div>
                                <span
                                  className="badge"
                                  style={{ backgroundColor: '#5F7654', color: '#FFFDF9', borderRadius: '4px' }}
                                >
                                  PAID ₹{booking.final_cost || booking.estimated_cost}
                                </span>
                              </div>
                            ) : (
                              <div
                                className="p-2.5 border d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2"
                                style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '6px' }}
                              >
                                <div>
                                  <span
                                    className="badge border small me-2"
                                    style={{ backgroundColor: '#FAF5EE', color: '#7D5224', borderColor: '#E6D4BD', borderRadius: '4px' }}
                                  >
                                    Pending Payment
                                  </span>
                                  <strong style={{ color: '#3E3027' }}>₹{booking.final_cost || booking.estimated_cost}</strong>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm px-3 shadow-xs text-white fw-semibold"
                                  style={{ backgroundColor: '#5F7654', borderRadius: '4px' }}
                                  onClick={() => handlePayNow(booking)}
                                  disabled={payingBookingId === booking.id}
                                >
                                  {payingBookingId === booking.id ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                      <span>Opening...</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-wallet2 me-1"></i> Pay Now
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Review Prompt */}
                            {booking.customer_rating ? (
                              <div
                                className="small p-2 border d-flex justify-content-between align-items-center"
                                style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '4px' }}
                              >
                                <div>
                                  <span className="fw-bold me-1" style={{ color: '#A9793F' }}>★ {booking.customer_rating}/5</span>
                                  <span className="fst-italic" style={{ color: '#4A382C' }}>"{booking.customer_review || 'Service completed'}"</span>
                                </div>
                                <span
                                  className="badge border"
                                  style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                                >
                                  Your Review
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm w-100 py-1"
                                style={{ borderColor: '#D8C7B5', color: '#5A3E2B', borderRadius: '4px' }}
                                onClick={() => handleOpenReviewModal(booking)}
                              >
                                <i className="bi bi-star-fill me-1" style={{ color: '#A9793F' }}></i> Rate &amp; Review Service
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Case D: Pending Assignment (Show Top Recommendation Card preview) */}
                    {booking.booking_status === 'pending' && !booking.technician_name && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small fw-semibold" style={{ color: '#4A382C' }}>
                            <i className="bi bi-check-circle-fill me-1" style={{ color: '#5F7654' }}></i> Top Match:
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 fw-semibold"
                            style={{ color: '#5A3E2B', textDecoration: 'none' }}
                            onClick={() => handleOpenRecommendations(booking)}
                          >
                            View All Matches ({booking.recommendations?.length || 1})
                          </button>
                        </div>

                        {booking.top_recommendation || (booking.recommendations && booking.recommendations.length > 0) ? (
                          <TechnicianRecommendationCard
                            rec={booking.top_recommendation || booking.recommendations[0]}
                            rank={1}
                            defaultExpanded={false}
                            onSelectTechnician={(tech) => handleInitiateSelectTechnician(booking, tech)}
                            selectable={true}
                            isSelecting={selectingLoading}
                          />
                        ) : (
                          <div
                            className="p-3 border d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                          >
                            <span className="small" style={{ color: '#4A382C' }}>Finding matching verified technicians...</span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-0 px-2"
                              style={{ borderColor: '#D8C7B5', color: '#5A3E2B', borderRadius: '4px' }}
                              onClick={() => handleOpenRecommendations(booking)}
                            >
                              Check Matches
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attached Media */}
                    <div className="d-flex gap-2 flex-wrap mb-2">
                      {booking.problem_image_url && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0.5 px-2"
                          style={{ borderColor: '#D8C7B5', color: '#5A3E2B', borderRadius: '4px' }}
                          onClick={() => setPreviewPhotoUrl(booking.problem_image_url)}
                        >
                          <i className="bi bi-image me-1"></i> Photo Attachment
                        </button>
                      )}
                      {booking.voice_complaint_url && (
                        <span
                          className="badge border p-1 px-2 d-inline-flex align-items-center gap-1"
                          style={{ backgroundColor: '#FFFDF9', color: '#3E3027', borderColor: '#D8C7B5', borderRadius: '4px' }}
                        >
                          <i className="bi bi-mic-fill text-danger"></i> Voice Recorded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div
                    className="p-3 px-4 border-top d-flex justify-content-between align-items-center flex-wrap gap-2"
                    style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
                  >
                    <div>
                      <span className="small d-block" style={{ color: '#4A382C' }}>Estimated Fee:</span>
                      <strong className="fs-5" style={{ color: '#5A3E2B' }}>₹{booking.final_cost || booking.estimated_cost}</strong>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      {['pending', 'technician_assigned', 'customer_selected_technician'].includes(booking.booking_status) && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          style={{ borderRadius: '4px' }}
                          onClick={() => setCancellingBookingId(booking.id)}
                        >
                          <i className="bi bi-x-circle me-1"></i> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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


      {/* CONFIRM TECHNICIAN SELECTION MODAL */}
      {confirmingTechnician && confirmingBooking && (
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
                  <i className="bi bi-person-check-fill fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Confirm Selection</h5>
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

              <div className="modal-body p-4 text-start">
                <p className="small mb-3" style={{ color: '#4A382C' }}>
                  You are selecting <strong>{confirmingTechnician.technicianName}</strong> for service {confirmingBooking.booking_reference}.
                </p>

                <div
                  className="p-3 border mb-3 small"
                  style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                >
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                    <span style={{ color: '#4A382C' }}>Technician:</span>
                    <strong style={{ color: '#3E3027' }}>{confirmingTechnician.technicianName}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                    <span style={{ color: '#4A382C' }}>Specialization:</span>
                    <span style={{ color: '#3E3027' }}>{confirmingTechnician.serviceName}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                    <span style={{ color: '#4A382C' }}>Match Score:</span>
                    <span
                      className="badge fw-semibold"
                      style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
                    >
                      {confirmingTechnician.matchScore}% Match
                    </span>
                  </div>
                  <div className="d-flex justify-content-between py-1 pt-2">
                    <span style={{ color: '#4A382C' }}>Visiting Fee:</span>
                    <strong className="fs-6" style={{ color: '#5A3E2B' }}>₹{confirmingTechnician.visitingCharges || 150}</strong>
                  </div>
                </div>

                <small className="d-block" style={{ color: '#4A382C' }}>
                  <i className="bi bi-info-circle me-1" style={{ color: '#5A3E2B' }}></i>
                  Booking status will update to <strong>Waiting for technician confirmation</strong>.
                </small>
              </div>

              <div
                className="modal-footer p-3 border-top"
                style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
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
                  className="btn btn-primary btn-sm px-4 fw-semibold shadow-xs"
                  onClick={handleConfirmTechnicianSelection}
                  disabled={selectingLoading}
                >
                  {selectingLoading ? (
                        <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      <span>Confirming...</span>
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
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(62, 48, 39, 0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div
              className="modal-content border shadow-lg overflow-hidden"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div
                className="modal-header border-bottom p-4"
                style={{ backgroundColor: '#F5EFE6', borderColor: '#D8C7B5' }}
              >
                <div>
                  <span
                    className="badge font-monospace mb-1"
                    style={{ backgroundColor: '#FFFDF9', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
                  >
                    {viewingRecommendationsBooking.booking_reference}
                  </span>
                  <h5 className="modal-title fw-bold mb-0" style={{ color: '#3E3027' }}>Recommended Technicians</h5>
                  <small style={{ color: '#4A382C' }}>
                    Matched based on trade specialization, location proximity, rating, and fee.
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewingRecommendationsBooking(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {loadingRecommendations ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" style={{ color: '#5A3E2B' }} role="status"></div>
                    <p className="small mt-2" style={{ color: '#4A382C' }}>Computing technician scores...</p>
                  </div>
                ) : (
                  <TechnicianRecommendationsList
                    recommendations={recommendationsList}
                    title="Available Technicians for Your Service"
                    onSelectTechnician={(tech) => handleInitiateSelectTechnician(viewingRecommendationsBooking, tech)}
                    selectedTechnicianId={viewingRecommendationsBooking.technician_id}
                    selectable={['pending', 'technician_rejected'].includes(viewingRecommendationsBooking.booking_status)}
                    isSelecting={selectingLoading}
                  />
                )}
              </div>

              <div
                className="modal-footer p-3 border-top"
                style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
              >
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

      {/* CANCELLATION MODAL */}
      {cancellingBookingId && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(62, 48, 39, 0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border shadow-lg overflow-hidden"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div
                className="modal-header text-white py-3 px-4 border-0"
                style={{ backgroundColor: '#9A4F43' }}
              >
                <h5 className="modal-title fw-bold mb-0">Cancel Service Booking</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setCancellingBookingId(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="small mb-3" style={{ color: '#4A382C' }}>
                  Please let us know why you are cancelling this appointment:
                </p>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. Issue resolved / Change of plans / Booked alternative service"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
              </div>
              <div
                className="modal-footer p-3 border-top"
                style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setCancellingBookingId(null)}
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  className="btn btn-sm px-4 fw-semibold text-white"
                  style={{ backgroundColor: '#9A4F43', borderRadius: '4px' }}
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

      {/* SECTION 15: DEMO PAYMENT MODAL */}
      {demoModalData && (
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
                  <i className="bi bi-wallet2 fs-4"></i>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">HOMEFIX Payment Gateway</h5>
                    <small className="opacity-75">Simulated Demo Checkout</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => !demoProcessing && setDemoModalData(null)}
                  disabled={demoProcessing}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Demo Notice Banner */}
                <div
                  className="alert d-flex align-items-center gap-3 p-3 mb-3 border"
                  style={{ backgroundColor: '#FAF5EE', borderColor: '#E6D4BD', color: '#7D5224', borderRadius: '6px' }}
                >
                  <i className="bi bi-shield-exclamation fs-3 flex-shrink-0" style={{ color: '#A9793F' }}></i>
                  <div>
                    <strong className="d-block fs-6" style={{ color: '#7D5224' }}>
                      Demo Payment — No real money is charged.
                    </strong>
                    <small style={{ color: '#4A382C' }}>
                      This simulated payment flow validates end-to-end checkout without credit card charges.
                    </small>
                  </div>
                </div>

                <div
                  className="p-3 border mb-3 small"
                  style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                >
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                    <span style={{ color: '#4A382C' }}>Booking Reference:</span>
                    <strong className="font-monospace" style={{ color: '#5A3E2B' }}>{demoModalData.booking.booking_reference}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                    <span style={{ color: '#4A382C' }}>Service Category:</span>
                    <strong style={{ color: '#3E3027' }}>{demoModalData.booking.service_name}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                    <span style={{ color: '#4A382C' }}>Technician:</span>
                    <span style={{ color: '#3E3027' }}>{demoModalData.booking.technician_name}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 pt-2">
                    <strong style={{ color: '#3E3027' }}>Total Amount Due:</strong>
                    <strong className="fs-5" style={{ color: '#5F7654' }}>₹{demoModalData.amount}</strong>
                  </div>
                </div>

                {/* Simulated Method Selector */}
                <div className="mb-2">
                  <label className="form-label small fw-semibold mb-2" style={{ color: '#3E3027' }}>Select Payment Method:</label>
                  <div className="d-flex flex-column gap-2">
                    {/* UPI Option */}
                    <div>
                      <label
                        className="p-2 px-3 border d-flex align-items-center justify-content-between"
                        style={{
                          cursor: 'pointer',
                          borderRadius: demoMethod === 'upi' ? '6px 6px 0 0' : '6px',
                          borderColor: demoMethod === 'upi' ? '#5A3E2B' : '#D8C7B5',
                          backgroundColor: demoMethod === 'upi' ? '#FAF5EE' : '#FFFDF9',
                          borderWidth: demoMethod === 'upi' ? '1.5px' : '1px',
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="radio"
                            name="demoMethod"
                            value="upi"
                            checked={demoMethod === 'upi'}
                            onChange={() => setDemoMethod('upi')}
                            className="form-check-input"
                          />
                          <span className="small fw-semibold" style={{ color: '#3E3027' }}>UPI (Instant Payment)</span>
                        </div>
                        <span
                          className="badge border small"
                          style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                        >
                          Recommended
                        </span>
                      </label>

                      {/* UPI Apps List and Option to Select */}
                      {demoMethod === 'upi' && (
                        <div
                          className="p-3 border border-top-0 rounded-bottom"
                          style={{ backgroundColor: '#FFFDF9', borderColor: '#5A3E2B', borderWidth: '1.5px' }}
                        >
                          <div className="small fw-semibold mb-2" style={{ color: '#5A3E2B' }}>
                            Select UPI App:
                          </div>
                          <div className="d-flex flex-column gap-2">
                            {[
                              {
                                id: 'gpay',
                                name: 'Google Pay (GPay)',
                                note: 'Instant UPI transfer via Google Pay',
                                badge: 'GPay',
                                badgeBg: '#4285F4',
                              },
                              {
                                id: 'phonepe',
                                name: 'PhonePe',
                                note: 'Pay directly via PhonePe UPI ID / Number',
                                badge: 'PhonePe',
                                badgeBg: '#5F259F',
                              },
                              {
                                id: 'paytm',
                                name: 'Paytm UPI',
                                note: 'Paytm Wallet & UPI Gateway',
                                badge: 'Paytm',
                                badgeBg: '#00BAF2',
                              },
                              {
                                id: 'bhim',
                                name: 'BHIM UPI',
                                note: 'Government NPCI Unified Payments Interface',
                                badge: 'BHIM',
                                badgeBg: '#00796B',
                              },
                              {
                                id: 'cred',
                                name: 'CRED Pay',
                                note: 'UPI payment via CRED app',
                                badge: 'CRED',
                                badgeBg: '#212121',
                              },
                            ].map((app) => {
                              const isSelected = selectedUpiApp === app.id;
                              return (
                                <label
                                  key={app.id}
                                  className="p-2 px-3 border rounded d-flex align-items-center justify-content-between"
                                  style={{
                                    cursor: 'pointer',
                                    borderColor: isSelected ? '#5A3E2B' : '#E5DCD3',
                                    backgroundColor: isSelected ? '#FAF5EE' : '#FFFFFF',
                                    borderWidth: isSelected ? '1.5px' : '1px',
                                  }}
                                  onClick={() => setSelectedUpiApp(app.id)}
                                >
                                  <div className="d-flex align-items-center gap-2.5">
                                    <input
                                      type="radio"
                                      name="selectedUpiApp"
                                      value={app.id}
                                      checked={isSelected}
                                      onChange={() => setSelectedUpiApp(app.id)}
                                      className="form-check-input"
                                    />
                                    <div>
                                      <div className="small fw-semibold" style={{ color: '#3E3027' }}>
                                        {app.name}
                                      </div>
                                      <div className="text-muted" style={{ fontSize: '0.73rem' }}>
                                        {app.note}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className="badge text-white px-2 py-1"
                                    style={{
                                      backgroundColor: app.badgeBg,
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {app.badge}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <label
                      className="p-2 px-3 border d-flex align-items-center justify-content-between"
                      style={{
                        cursor: 'pointer',
                        borderRadius: '6px',
                        borderColor: demoMethod === 'card' ? '#5A3E2B' : '#D8C7B5',
                        backgroundColor: demoMethod === 'card' ? '#FAF5EE' : '#FFFDF9',
                        borderWidth: demoMethod === 'card' ? '1.5px' : '1px',
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="radio"
                          name="demoMethod"
                          value="card"
                          checked={demoMethod === 'card'}
                          onChange={() => setDemoMethod('card')}
                          className="form-check-input"
                        />
                        <span className="small fw-semibold" style={{ color: '#3E3027' }}>Credit / Debit Card</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div
                className="modal-footer p-3 border-top"
                style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setDemoModalData(null)}
                  disabled={demoProcessing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm fw-semibold px-4 shadow-sm text-white"
                  style={{ backgroundColor: '#5F7654', borderRadius: '4px' }}
                  onClick={handleConfirmDemoPayment}
                  disabled={demoProcessing}
                >
                  {demoProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1"></i> Pay ₹{demoModalData.amount}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  How was your experience with <strong>{reviewingBooking.technician_name}</strong> for{' '}
                  <strong>{reviewingBooking.service_name}</strong>?
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
                  <label className="form-label small fw-semibold" style={{ color: '#3E3027' }}>Feedback Comments:</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Share how the technician did (punctuality, work quality, professionalism)..."
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

      {/* PHOTO PREVIEW MODAL */}
      {previewPhotoUrl && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(62, 48, 39, 0.85)', zIndex: 1060 }}
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-transparent border-0 text-center">
              <img
                src={getMediaUrl(previewPhotoUrl)}
                alt="Problem preview"
                className="img-fluid shadow-lg mx-auto"
                style={{ maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                onError={(e) => {
                  const path = previewPhotoUrl.startsWith('/') ? previewPhotoUrl : `/${previewPhotoUrl}`;
                  if (!e.target.src.includes(':5000')) {
                    e.target.src = `http://localhost:5000${path}`;
                  }
                }}
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-light btn-sm px-4 fw-semibold"
                  style={{ borderRadius: '4px' }}
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
  </div>
  );
}
