import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getMyBookingsApi,
  getTechnicianServiceRequestsApi,
  getTechnicianAssignedJobsApi,
  acceptBookingApi,
  rejectBookingApi,
  getBookingDetailsApi,
  startServiceApi,
  completeServiceApi,
  getToolMaterialSuggestionsApi,
  getAdminDashboardStatsApi,
  getAdminCustomersApi,
  getAdminCustomerDetailsApi,
  updateCustomerStatusApi,
  deleteCustomerApi,
  getAdminTechniciansApi,
  verifyTechnicianApi,
  updateTechnicianStatusApi,
  deleteTechnicianApi,
  getAdminBookingsApi,
  getAdminPaymentsApi,
  getAdminReviewsApi,
  getAdminAuditLogsApi,
  getTechnicianEarningsApi,
  getAdminPayoutsApi,
  markPayoutPaidApi,
} from '../services/api.js';
import StatusBadge, { UrgencyBadge } from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CardSkeleton, TableRowSkeleton, StatCardSkeleton } from '../components/LoadingSkeleton.jsx';

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

const STANDARD_TRADE_TOOLKITS = {
  plumbing: {
    tools: [
      { name: 'Adjustable pipe wrench', reason: 'For gripping, tightening, and loosening threaded pipe joints and fittings.' },
      { name: 'Water pump slip-joint pliers', reason: 'Heavy-duty adjustable pliers for valves, nuts, and tight couplings.' },
      { name: 'Plumber screwdriver set & inspection torch', reason: 'For access panels, fixture clamps, and dark sub-sink inspection.' },
    ],
    materials: [
      { name: 'PTFE Teflon thread seal tape', reason: 'Creates a watertight, leak-proof seal on male pipe threads.' },
      { name: 'Replacement washers & O-rings assortment', reason: 'Universal seals for fixing dripping taps and connection leaks.' },
      { name: 'Waterproof silicone sealant', reason: 'Seals fixture collars, drain rims, and tile-to-pipe gaps.' },
    ],
    safetyNote: 'Turn off the main overhead/inlet water supply valve and relieve line pressure before loosening pipe joints or fittings.',
  },
  electrical: {
    tools: [
      { name: 'Digital Multimeter', reason: 'Measures voltage, continuity, and resistance across electrical circuits.' },
      { name: 'Insulated screwdriver set (1000V rated)', reason: 'Safely fastens electrical switchboard terminals and covers.' },
      { name: 'Neon phase / voltage tester', reason: 'Detects presence of live current before touching any wiring.' },
    ],
    materials: [
      { name: 'PVC electrical insulation tape', reason: 'Dielectric insulation over wire splices and exposed terminals.' },
      { name: 'Twist-on wire connectors', reason: 'Secure, fire-safe wire joints inside junction boxes.' },
      { name: 'Replacement fuses & MCB links', reason: 'Standard fuses for restoring tripped circuit protection.' },
    ],
    safetyNote: 'Always turn off the main circuit breaker (MCB) and verify with a voltage tester before touching switchboards.',
  },
  carpentry: {
    tools: [
      { name: 'Cordless drill & bit set', reason: 'For driving screws and drilling pilot holes in wood and masonry.' },
      { name: 'Claw hammer & pry bar', reason: 'For driving/extracting nails and aligning wooden fixtures.' },
      { name: 'Screwdriver set & measuring tape', reason: 'For hardware adjustments, hinge alignment, and precise measurements.' },
    ],
    materials: [
      { name: 'Assorted wood screws', reason: 'Zinc-coated multipurpose screws for hinges, brackets, and framing.' },
      { name: 'Wood glue (PVA)', reason: 'High-strength adhesive for bonding loose joints and dowels.' },
      { name: 'Sandpaper assortment', reason: 'Assorted grits for smoothing edges and preparing wood surfaces.' },
    ],
    safetyNote: 'Wear eye protection and work gloves when using power drills, saws, or sharp wood chisels.',
  },
  painting: {
    tools: [
      { name: 'Paint roller & extension tray', reason: 'Evenly applies broad base coats across interior and exterior walls.' },
      { name: 'Angled sash paint brushes', reason: 'Cuts in cleanly along edges, trim, baseboards, and corners.' },
      { name: 'Putty knife & surface scraper', reason: 'Pares away peeling paint and smooths patching compound.' },
    ],
    materials: [
      { name: 'Wall putty & crack filler', reason: 'Acrylic compound to fill holes, cracks, and surface blemishes.' },
      { name: 'Painter masking tape & drop sheet', reason: 'Protects trim, fixtures, and flooring from paint splatter.' },
      { name: 'Interior wall primer', reason: 'Seals porous plaster and ensures uniform topcoat adhesion.' },
    ],
    safetyNote: 'Ensure adequate cross-ventilation in all working areas and wear a dust mask when sanding.',
  },
  ac_servicing: {
    tools: [
      { name: 'Manifold gauge set & hoses', reason: 'Measures low and high-side refrigerant pressures.' },
      { name: 'Digital thermometer probe', reason: 'Measures intake vs. supply vent temperature differential.' },
      { name: 'Fin comb & coil cleaning brush', reason: 'Cleans and straightens bent condenser and evaporator fins.' },
    ],
    materials: [
      { name: 'Foaming coil cleaner', reason: 'Dissolves dust, grease, and microbial buildup on cooling coils.' },
      { name: 'Thermal insulation tape', reason: 'Prevents condensation dripping on cold copper suction lines.' },
      { name: 'Condensate drain tablets', reason: 'Clears drain pans and prevents microbial algae clogging.' },
    ],
    safetyNote: 'Disconnect electrical isolator before servicing indoor or outdoor AC units.',
  },
  cleaning: {
    tools: [
      { name: 'Wet & dry vacuum cleaner', reason: 'Deep extraction of dust, grit, and liquid spills.' },
      { name: 'Microfiber cloth set', reason: 'Lint-free, scratch-safe polishing and surface wiping.' },
      { name: 'Heavy-duty scrub brushes', reason: 'Removes stubborn soap scum and tile grout grime.' },
    ],
    materials: [
      { name: 'Multi-surface disinfectant', reason: 'Sanitizing solution for countertops, tiles, and fixtures.' },
      { name: 'Glass & mirror polish', reason: 'Streak-free formula for windows, mirrors, and metallic trim.' },
      { name: 'Protective nitrile gloves', reason: 'Protects technician hands from cleaning chemicals.' },
    ],
    safetyNote: 'Ensure good ventilation when using chemical disinfectants and wear protective gloves.',
  },
};

const getStandardTradeKit = (serviceName) => {
  const raw = String(serviceName || '').toLowerCase();
  if (raw.includes('plumb')) return STANDARD_TRADE_TOOLKITS.plumbing;
  if (raw.includes('electr')) return STANDARD_TRADE_TOOLKITS.electrical;
  if (raw.includes('carpen')) return STANDARD_TRADE_TOOLKITS.carpentry;
  if (raw.includes('paint')) return STANDARD_TRADE_TOOLKITS.painting;
  if (raw.includes('ac') || raw.includes('appliance') || raw.includes('cool')) return STANDARD_TRADE_TOOLKITS.ac_servicing;
  if (raw.includes('clean')) return STANDARD_TRADE_TOOLKITS.cleaning;
  return STANDARD_TRADE_TOOLKITS.plumbing;
};

export default function Dashboard({ healthData, healthLoading, onRefreshHealth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, technicianProfile, logout } = useAuth();

  // Redirect if unauthenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Read URL query parameter for tabs
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      if (user?.role === 'technician' && ['requests', 'assigned', 'earnings', 'profile'].includes(tabParam)) {
        setTechTab(tabParam);
      } else if (user?.role === 'admin' && ['overview', 'customers', 'technicians', 'bookings', 'payments', 'payouts', 'reviews'].includes(tabParam)) {
        setAdminTab(tabParam);
      }
    }
  }, [location, user]);

  // =========================================================================
  // CUSTOMER STATE & DATA
  // =========================================================================
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);

  const fetchCustomerDashboardData = async () => {
    if (!token || user?.role !== 'user') return;
    setLoadingCustomerData(true);
    const res = await getMyBookingsApi(token);
    if (res.ok && res.data?.success) {
      setCustomerBookings(res.data.data || []);
    }
    setLoadingCustomerData(false);
  };

  useEffect(() => {
    if (user?.role === 'user') {
      fetchCustomerDashboardData();
    }
  }, [user, token]);

  // =========================================================================
  // TECHNICIAN STATE & DATA
  // =========================================================================
  const [techTab, setTechTab] = useState('requests'); // 'requests' | 'assigned' | 'profile'
  const [serviceRequests, setServiceRequests] = useState([]);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });
  const [serviceNotes, setServiceNotes] = useState({});
  const [jobStatusFilter, setJobStatusFilter] = useState('active');
  const [technicianEarnings, setTechnicianEarnings] = useState({ summary: {}, earnings: [] });
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // Tool & Material suggestions state per booking: { [bookingId]: { loading, data, error } }
  const [toolSuggestions, setToolSuggestions] = useState({});

  // Rejection & photo viewer modals
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState('Schedule conflict');
  const [customReason, setCustomReason] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState({});
  const [selectedTimelineBooking, setSelectedTimelineBooking] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchToolSuggestions = async (bookingId, forceRefresh = false) => {
    if (!bookingId || !token) return;
    setToolSuggestions((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], loading: true, error: null },
    }));

    try {
      const res = await getToolMaterialSuggestionsApi(bookingId, token, forceRefresh);
      if (res.ok && res.data?.success) {
        setToolSuggestions((prev) => ({
          ...prev,
          [bookingId]: { loading: false, data: res.data, error: null },
        }));
      } else {
        setToolSuggestions((prev) => ({
          ...prev,
          [bookingId]: {
            loading: false,
            data: null,
            error: res.data?.message || 'Failed to load recommendations.',
          },
        }));
      }
    } catch (err) {
      setToolSuggestions((prev) => ({
        ...prev,
        [bookingId]: {
          loading: false,
          data: null,
          error: err.message || 'Error fetching recommendations.',
        },
      }));
    }
  };

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
        const jobs = jobsRes.data.data || [];
        setAssignedJobs(jobs);
        jobs.forEach((j) => fetchToolSuggestions(j.id));
      }
    } catch (err) {
      console.error('Failed to load technician data:', err);
    } finally {
      setLoadingRequests(false);
      setLoadingJobs(false);
    }
  };

  const fetchTechnicianEarnings = async () => {
    if (!token || user?.role !== 'technician') return;
    setLoadingEarnings(true);
    try {
      const res = await getTechnicianEarningsApi(token);
      if (res.ok && res.data?.success) {
        setTechnicianEarnings(res.data.data || { summary: {}, earnings: [] });
      }
    } catch (err) {
      console.error('Failed to load technician earnings:', err);
    } finally {
      setLoadingEarnings(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'technician') {
      fetchTechnicianData();
      fetchTechnicianEarnings();
    }
  }, [user, token]);

  useEffect(() => {
    if (user?.role === 'technician' && techTab === 'earnings') {
      fetchTechnicianEarnings();
    }
  }, [techTab, user, token]);

  const handleAccept = async (bookingId, bookingRef) => {
    setActionLoadingId(bookingId);
    setActionFeedback({ type: '', message: '' });
    const res = await acceptBookingApi(bookingId, token);
    setActionLoadingId(null);

    if (res.ok && res.data.success) {
      setActionFeedback({
        type: 'success',
        message: `Service request ${bookingRef || ''} accepted! It is now in your Active Jobs.`,
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
    const targetBooking = rejectingBooking;
    const bookingId = targetBooking.id;
    const finalReason =
      rejectReason === 'Other' && customReason.trim() ? customReason.trim() : rejectReason;

    setActionLoadingId(bookingId);
    setActionFeedback({ type: '', message: '' });
    try {
      const res = await rejectBookingApi(bookingId, finalReason, token);
      setActionLoadingId(null);

      if (res.ok && res.data.success) {
        setRejectingBooking(null);
        setCustomReason('');
        setActionFeedback({
          type: 'info',
          message: `Service request ${targetBooking.booking_reference || bookingId} declined.`,
        });
        fetchTechnicianData();
      } else {
        setActionFeedback({
          type: 'danger',
          message: res.data?.message || 'Failed to decline service request.',
        });
      }
    } catch (err) {
      setActionLoadingId(null);
      setActionFeedback({
        type: 'danger',
        message: err.message || 'Error declining service request.',
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
        message: `Service for ${bookingRef || 'booking'} started! Status is now In Progress.`,
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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  // =========================================================================
  // ADMIN STATE & DATA
  // =========================================================================
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'customers' | 'technicians' | 'bookings' | 'payments' | 'reviews' | 'logs' | 'health'
  const [adminStats, setAdminStats] = useState(null);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminTechnicians, setAdminTechnicians] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState({ type: '', message: '' });

  // Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [techVerificationFilter, setTechVerificationFilter] = useState('all');
  const [techSearch, setTechSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [adminPayouts, setAdminPayouts] = useState({ summary: {}, payouts: [] });
  const [payoutActionLoadingId, setPayoutActionLoadingId] = useState(null);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [payoutSearch, setPayoutSearch] = useState('');

  // Customer Details Modal
  const [viewCustomerModal, setViewCustomerModal] = useState(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);

  // Technician Rejection Modal
  const [rejectingTech, setRejectingTech] = useState(null);
  const [techRejectReason, setTechRejectReason] = useState('Documents could not be verified');
  const [techRejectCustomReason, setTechRejectCustomReason] = useState('');
  const [actionLoadingTechId, setActionLoadingTechId] = useState(null);

  // Customer & Technician Deletion Modals
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deletingTechnician, setDeletingTechnician] = useState(null);

  const fetchAdminStats = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    setAdminError(null);
    try {
      const res = await getAdminDashboardStatsApi(token);
      if (res.ok && res.data?.success) {
        setAdminStats(res.data.data);
      } else {
        setAdminError(res.data?.message || 'Failed to fetch admin stats.');
      }
    } catch (err) {
      setAdminError(err.message || 'Error loading dashboard statistics.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminCustomers = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const res = await getAdminCustomersApi(token, customerSearch ? { search: customerSearch } : {});
      if (res.ok && res.data?.success) {
        setAdminCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminTechnicians = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const params = {};
      if (techVerificationFilter !== 'all') params.verification_status = techVerificationFilter;
      if (techSearch) params.search = techSearch;
      const res = await getAdminTechniciansApi(token, params);
      if (res.ok && res.data?.success) {
        setAdminTechnicians(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminBookings = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const filters = {};
      if (bookingStatusFilter !== 'all') filters.status = bookingStatusFilter;
      if (bookingPaymentFilter !== 'all') filters.payment_status = bookingPaymentFilter;
      const res = await getAdminBookingsApi(token, filters);
      if (res.ok && res.data?.success) {
        setAdminBookings(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminPayments = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const filters = {};
      if (paymentStatusFilter !== 'all') filters.status = paymentStatusFilter;
      const res = await getAdminPaymentsApi(token, filters);
      if (res.ok && res.data?.success) {
        setAdminPayments(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminReviews = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const res = await getAdminReviewsApi(token);
      if (res.ok && res.data?.success) {
        setAdminReviews(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminLogs = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      const res = await getAdminAuditLogsApi(token);
      if (res.ok && res.data?.success) {
        setAdminLogs(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchAdminPayouts = async () => {
    if (!token || user?.role !== 'admin') return;
    setLoadingAdmin(true);
    setAdminError(null);
    try {
      const res = await getAdminPayoutsApi(token);
      if (res.ok && res.data?.success) {
        setAdminPayouts(res.data.data || { summary: {}, payouts: [] });
      } else {
        setAdminError(res.data?.message || 'Failed to fetch technician payouts.');
      }
    } catch (err) {
      setAdminError(err.message || 'Error loading payouts.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleMarkPayoutPaid = async (payoutId) => {
    setPayoutActionLoadingId(payoutId);
    try {
      const res = await markPayoutPaidApi(payoutId, token);
      if (res.ok && res.data?.success) {
        setAdminFeedback({
          type: 'success',
          message: res.data.message || `Payout #${payoutId} marked as PAID!`,
        });
        fetchAdminPayouts();
      } else {
        setAdminFeedback({
          type: 'danger',
          message: res.data?.message || 'Failed to mark payout as paid.',
        });
      }
    } catch (err) {
      setAdminFeedback({
        type: 'danger',
        message: err.message || 'Error updating payout status.',
      });
    } finally {
      setPayoutActionLoadingId(null);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      if (adminTab === 'overview') fetchAdminStats();
      else if (adminTab === 'customers') fetchAdminCustomers();
      else if (adminTab === 'technicians') fetchAdminTechnicians();
      else if (adminTab === 'bookings') fetchAdminBookings();
      else if (adminTab === 'payments') fetchAdminPayments();
      else if (adminTab === 'payouts') fetchAdminPayouts();
      else if (adminTab === 'reviews') fetchAdminReviews();
      else if (adminTab === 'logs') fetchAdminLogs();
    }
  }, [user, token, adminTab]);

  const handleViewCustomer = async (customerId) => {
    setCustomerDetailLoading(true);
    setViewCustomerModal({ loading: true });
    try {
      const res = await getAdminCustomerDetailsApi(customerId, token);
      if (res.ok && res.data?.success) {
        setViewCustomerModal(res.data.data);
      } else {
        setAdminFeedback({ type: 'danger', message: res.data?.message || 'Could not load customer details.' });
        setViewCustomerModal(null);
      }
    } catch (err) {
      setAdminFeedback({ type: 'danger', message: err.message });
      setViewCustomerModal(null);
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  const handleToggleCustomerStatus = async (customer) => {
    const nextStatus = customer.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Mark customer "${customer.name}" as ${nextStatus.toUpperCase()}?`)) return;

    setActionLoadingTechId(`cust-${customer.id}`);
    try {
      const res = await updateCustomerStatusApi(customer.id, nextStatus, token, `Admin updated status to ${nextStatus}`);
      if (res.ok && res.data?.success) {
        setAdminFeedback({ type: 'success', message: `Customer "${customer.name}" account is now ${nextStatus}.` });
        fetchAdminCustomers();
        fetchAdminStats();
      } else {
        setAdminFeedback({ type: 'danger', message: res.data?.message || 'Failed to update customer status.' });
      }
    } catch (err) {
      setAdminFeedback({ type: 'danger', message: err.message || 'Failed to update customer status.' });
    } finally {
      setActionLoadingTechId(null);
    }
  };

  const handleToggleTechnicianStatus = async (tech) => {
    const currentStatus = tech.account_status || tech.status || 'active';
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Mark technician "${tech.name}" account as ${nextStatus.toUpperCase()}?`)) return;

    setActionLoadingTechId(`tech-status-${tech.id}`);
    try {
      const res = await updateTechnicianStatusApi(tech.id, nextStatus, token, `Admin updated account status to ${nextStatus}`);
      if (res.ok && res.data?.success) {
        setAdminFeedback({ type: 'success', message: `Technician "${tech.name}" account is now ${nextStatus}.` });
        fetchAdminTechnicians();
        fetchAdminStats();
      } else {
        setAdminFeedback({ type: 'danger', message: res.data?.message || 'Failed to update technician account status.' });
      }
    } catch (err) {
      setAdminFeedback({ type: 'danger', message: err.message || 'Failed to update technician account status.' });
    } finally {
      setActionLoadingTechId(null);
    }
  };

  const handleVerifyTechnician = async (techId, verification_status, remarks = '') => {
    setActionLoadingTechId(`verify-${techId}`);
    try {
      const res = await verifyTechnicianApi(techId, verification_status, token, remarks || `Technician ${verification_status}`);
      if (res.ok && res.data?.success) {
        setAdminFeedback({ type: 'success', message: `Technician verification status updated to ${verification_status.toUpperCase()}.` });
        fetchAdminTechnicians();
        fetchAdminStats();
      }
    } finally {
      setActionLoadingTechId(null);
    }
  };

  const handleConfirmRejectTechnician = async () => {
    if (!rejectingTech) return;
    const finalReason = techRejectReason === 'Other' ? techRejectCustomReason : techRejectReason;
    setActionLoadingTechId(`verify-${rejectingTech.id}`);
    try {
      const res = await verifyTechnicianApi(rejectingTech.id, 'rejected', token, finalReason || 'Verification rejected by administrator.');
      if (res.ok && res.data?.success) {
        setAdminFeedback({ type: 'success', message: `Technician ${rejectingTech.name} verification rejected.` });
        setRejectingTech(null);
        setTechRejectCustomReason('');
        fetchAdminTechnicians();
        fetchAdminStats();
      } else {
        setAdminFeedback({ type: 'danger', message: res.data?.message || 'Failed to reject technician verification.' });
      }
    } catch (err) {
      setAdminFeedback({ type: 'danger', message: err.message || 'Error rejecting technician verification.' });
    } finally {
      setActionLoadingTechId(null);
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    const targetCust = deletingCustomer;
    setActionLoadingTechId(`delete-cust-${targetCust.id}`);
    try {
      const res = await deleteCustomerApi(targetCust.id, token);
      if (res.ok && res.data?.success) {
        setAdminFeedback({
          type: 'success',
          message: res.data.message || `Customer "${targetCust.name}" has been permanently deleted.`,
        });
        setDeletingCustomer(null);
        fetchAdminCustomers();
        fetchAdminStats();
      } else {
        setAdminFeedback({
          type: 'danger',
          message: res.data?.message || 'Failed to delete customer account.',
        });
      }
    } catch (err) {
      setAdminFeedback({
        type: 'danger',
        message: err.message || 'Error deleting customer account.',
      });
    } finally {
      setActionLoadingTechId(null);
    }
  };

  const handleConfirmDeleteTechnician = async () => {
    if (!deletingTechnician) return;
    const targetTech = deletingTechnician;
    setActionLoadingTechId(`delete-tech-${targetTech.id}`);
    try {
      const res = await deleteTechnicianApi(targetTech.id, token);
      if (res.ok && res.data?.success) {
        setAdminFeedback({
          type: 'success',
          message: res.data.message || `Technician "${targetTech.name}" has been permanently deleted.`,
        });
        setDeletingTechnician(null);
        fetchAdminTechnicians();
        fetchAdminStats();
      } else {
        setAdminFeedback({
          type: 'danger',
          message: res.data?.message || 'Failed to delete technician.',
        });
      }
    } catch (err) {
      setAdminFeedback({
        type: 'danger',
        message: err.message || 'Error deleting technician.',
      });
    } finally {
      setActionLoadingTechId(null);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!user) return null;

  return (
    <div className="py-5" style={{ backgroundColor: '#FAF7F2', minHeight: '85vh' }}>
      <div className="container">
        {/* Top Welcome Header */}
        <div
          className="p-4 p-md-5 mb-4 border shadow-sm"
          style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="fw-bold mb-1" style={{ color: '#3E3027' }}>
                {getGreeting()}, {user.role === 'admin' ? (user.name === 'System Administrator' || user.name === 'System Administration' ? 'Admin' : user.name) : user.name}
              </h2>
              <p className="small mb-0" style={{ color: '#4A382C' }}>
                {user.role === 'user' && 'Welcome to your HOMEFIX home page. Manage your bookings, request repairs, and view service status.'}
                {user.role === 'technician' && 'Manage incoming service requests, active repairs, and tools.'}
                {user.role === 'admin' && 'Monitor real-time bookings, verify trade technicians, and review platform services.'}
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              {user.role === 'user' && (
                <Link
                  to="/book-service"
                  className="btn btn-primary btn-sm px-3 shadow-xs fw-semibold"
                  style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  <i className="bi bi-calendar-plus me-1"></i> Book a Service
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="btn btn-outline-danger btn-sm px-3"
                style={{ borderRadius: '4px' }}
                title="Sign out"
              >
                <i className="bi bi-box-arrow-right me-1"></i> Logout
              </button>
            </div>
          </div>
        </div>

      {/* =================================================================== */}
      {/* SECTION 7: CUSTOMER DASHBOARD */}
      {/* =================================================================== */}
      {user.role === 'user' && (
        <div>
          {/* Summary Metric Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-primary-subtle text-primary">
                  <i className="bi bi-calendar2-check"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {customerBookings.filter((b) => ['accepted', 'in_progress'].includes(b.booking_status)).length}
                  </div>
                  <div className="hf-stat-label">Active Bookings</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-success-subtle text-success">
                  <i className="bi bi-check2-all"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {customerBookings.filter((b) => b.booking_status === 'completed').length}
                  </div>
                  <div className="hf-stat-label">Completed Services</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-warning-subtle text-warning">
                  <i className="bi bi-hourglass-split"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {customerBookings.filter((b) => ['pending', 'customer_selected_technician', 'technician_assigned'].includes(b.booking_status)).length}
                  </div>
                  <div className="hf-stat-label">Pending Requests</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-info-subtle text-info">
                  <i className="bi bi-clock"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {customerBookings.filter((b) => ['pending', 'customer_selected_technician', 'accepted'].includes(b.booking_status)).length}
                  </div>
                  <div className="hf-stat-label">Upcoming Services</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hf-card p-4 mb-4">
            <h6 className="fw-bold text-dark mb-3">Quick Actions</h6>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/book-service" className="btn btn-primary px-4 shadow-xs">
                <i className="bi bi-plus-lg me-1"></i> Book a Service
              </Link>
              <Link to="/my-bookings" className="btn btn-outline-primary px-4">
                <i className="bi bi-card-checklist me-1"></i> My Bookings
              </Link>
              <Link to="/service-history" className="btn btn-outline-secondary px-4">
                <i className="bi bi-clock-history me-1"></i> Service History
              </Link>
            </div>
          </div>

          {/* Recent Bookings Section */}
          <div className="hf-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-0">Recent Bookings</h5>
                <p className="text-secondary small mb-0">Your latest home repair complaints and status.</p>
              </div>
              <Link to="/my-bookings" className="btn btn-link btn-sm p-0 text-primary fw-semibold">
                View All &rarr;
              </Link>
            </div>

            {loadingCustomerData ? (
              <CardSkeleton count={3} />
            ) : customerBookings.length === 0 ? (
              <div className="text-center py-5">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: '48px', height: '48px', backgroundColor: '#F5EFE6', color: '#5A3E2B' }}
                >
                  <i className="bi bi-calendar-x fs-4"></i>
                </div>
                <p className="fw-semibold mb-3" style={{ color: '#4A382C', fontSize: '1.05rem' }}>
                  No recent bookings
                </p>
                <Link
                  to="/book-service"
                  className="btn btn-primary px-4 py-2 fw-semibold"
                  style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  Book a Service
                </Link>
              </div>
            ) : (
              <div className="row g-3">
                {customerBookings.slice(0, 6).map((b) => (
                  <div className="col-12 col-md-6 col-lg-4" key={b.id}>
                    <div
                      className="p-3 h-100 d-flex flex-column justify-content-between"
                      style={{
                        backgroundColor: '#FFFDF9',
                        border: '1px solid #D8C7B5',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                      }}
                    >
                      <div>
                        {/* Service Name & Status */}
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <span className="fw-bold" style={{ color: '#5A3E2B', fontSize: '1rem' }}>
                            {b.service_name}
                          </span>
                          <StatusBadge status={b.booking_status} />
                        </div>

                        {/* Problem / Complaint Title */}
                        <h6
                          className="fw-semibold mb-3 text-truncate"
                          style={{ color: '#2B1E16', fontSize: '0.95rem' }}
                          title={b.problem_title}
                        >
                          {b.problem_title}
                        </h6>

                        {/* Booking Details */}
                        <div className="small mb-3" style={{ color: '#4A382C', fontSize: '0.85rem' }}>
                          <div className="d-flex justify-content-between mb-1.5">
                            <span className="text-muted">Booking ID:</span>
                            <span className="font-monospace fw-semibold" style={{ color: '#5A3E2B' }}>
                              #{b.booking_reference}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mb-1.5">
                            <span className="text-muted">Date:</span>
                            <span>
                              {new Date(b.scheduled_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Amount:</span>
                            <span className="fw-bold" style={{ color: '#2B1E16' }}>
                              ₹{b.final_cost || b.estimated_cost}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-top" style={{ borderColor: '#EBE0D3' }}>
                        <Link
                          to="/my-bookings"
                          className="btn btn-outline-primary btn-sm w-100 fw-semibold"
                          style={{
                            borderColor: '#D8C7B5',
                            color: '#5A3E2B',
                            backgroundColor: '#FFFDF9',
                          }}
                        >
                          View Booking
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 11, 12, 13, 14: TECHNICIAN WORKSPACE */}
      {/* =================================================================== */}
      {user.role === 'technician' && (
        <div>
          {/* Top Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-warning-subtle text-warning">
                  <i className="bi bi-inbox"></i>
                </div>
                <div>
                  <div className="hf-stat-val">{serviceRequests.length}</div>
                  <div className="hf-stat-label">New Requests</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-primary-subtle text-primary">
                  <i className="bi bi-hand-thumbs-up-fill"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {assignedJobs.filter((j) => j.booking_status === 'accepted').length}
                  </div>
                  <div className="hf-stat-label">Accepted Jobs</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-info-subtle text-info">
                  <i className="bi bi-gear-fill"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {assignedJobs.filter((j) => j.booking_status === 'in_progress').length}
                  </div>
                  <div className="hf-stat-label">Active Jobs</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="hf-stat-card">
                <div className="hf-stat-icon bg-success-subtle text-success">
                  <i className="bi bi-check2-all"></i>
                </div>
                <div>
                  <div className="hf-stat-val">
                    {assignedJobs.filter((j) => j.booking_status === 'completed').length}
                  </div>
                  <div className="hf-stat-label">Completed Jobs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Feedback Alert */}
          {actionFeedback.message && (
            <div className={`alert alert-${actionFeedback.type} alert-dismissible fade show rounded-3 mb-4 d-flex align-items-center gap-2 shadow-xs`} role="alert">
              <i className={`bi ${actionFeedback.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-info-circle-fill'} fs-5`}></i>
              <div>{actionFeedback.message}</div>
              <button type="button" className="btn-close" onClick={() => setActionFeedback({ type: '', message: '' })}></button>
            </div>
          )}

          {/* Technician Verification Status Alert Banner */}
          {technicianProfile && technicianProfile.verification_status !== 'verified' && (
            <div
              className="alert d-flex align-items-center gap-3 p-3 mb-4 shadow-sm border"
              style={{
                backgroundColor: technicianProfile.verification_status === 'rejected' ? '#FAF0EE' : '#FAF5EE',
                borderColor: technicianProfile.verification_status === 'rejected' ? '#E6BFB8' : '#E6D4BD',
                color: technicianProfile.verification_status === 'rejected' ? '#7A3328' : '#7D5224',
                borderRadius: '6px',
              }}
            >
              <i
                className={`bi ${technicianProfile.verification_status === 'rejected' ? 'bi-shield-x' : 'bi-shield-exclamation'} fs-2 flex-shrink-0`}
                style={{ color: technicianProfile.verification_status === 'rejected' ? '#9A4F43' : '#A9793F' }}
              ></i>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="fw-bold mb-0" style={{ color: technicianProfile.verification_status === 'rejected' ? '#7A3328' : '#7D5224' }}>
                    {technicianProfile.verification_status === 'rejected'
                      ? 'Technician Profile Verification Rejected'
                      : 'Technician Account Pending Admin Verification'}
                  </h6>
                  <span
                    className="badge text-uppercase"
                    style={{
                      backgroundColor: technicianProfile.verification_status === 'rejected' ? '#9A4F43' : '#A9793F',
                      color: '#FFFDF9',
                      borderRadius: '4px',
                    }}
                  >
                    {technicianProfile.verification_status || 'Pending'}
                  </span>
                </div>
                <p className="mb-0 small" style={{ color: '#4A382C' }}>
                  {technicianProfile.verification_status === 'rejected'
                    ? 'Your technician credentials have been rejected by the administrator. You cannot accept customer service requests.'
                    : 'Your technician credentials are under admin review. You can browse incoming service requests, but admin approval is required before you can accept bookings.'}
                </p>
              </div>
            </div>
          )}

          {/* Technician Navigation Tabs */}
          <div
            className="d-flex p-1 border mb-4 gap-1"
            style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '6px' }}
            role="tablist"
          >
            <button
              className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                backgroundColor: techTab === 'requests' ? '#5A3E2B' : 'transparent',
                color: techTab === 'requests' ? '#FFFDF9' : '#4A382C',
                borderRadius: '4px',
              }}
              onClick={() => setTechTab('requests')}
            >
              <i className="bi bi-inbox"></i>
              <span>Service Requests</span>
              {serviceRequests.length > 0 && (
                <span
                  className="badge ms-1"
                  style={{
                    backgroundColor: techTab === 'requests' ? '#E8D8C7' : '#9A4F43',
                    color: techTab === 'requests' ? '#5A3E2B' : '#FFFDF9',
                    borderRadius: '4px',
                  }}
                >
                  {serviceRequests.length}
                </span>
              )}
            </button>

            <button
              className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                backgroundColor: techTab === 'assigned' ? '#5A3E2B' : 'transparent',
                color: techTab === 'assigned' ? '#FFFDF9' : '#4A382C',
                borderRadius: '4px',
              }}
              onClick={() => setTechTab('assigned')}
            >
              <i className="bi bi-briefcase"></i>
              <span>Active Jobs</span>
              {assignedJobs.filter((j) => ['accepted', 'in_progress'].includes(j.booking_status)).length > 0 && (
                <span
                  className="badge ms-1"
                  style={{
                    backgroundColor: techTab === 'assigned' ? '#E8D8C7' : '#F5EFE6',
                    color: '#5A3E2B',
                    border: techTab === 'assigned' ? 'none' : '1px solid #D8C7B5',
                    borderRadius: '4px',
                  }}
                >
                  {assignedJobs.filter((j) => ['accepted', 'in_progress'].includes(j.booking_status)).length}
                </span>
              )}
            </button>

            <button
              className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                backgroundColor: techTab === 'earnings' ? '#5A3E2B' : 'transparent',
                color: techTab === 'earnings' ? '#FFFDF9' : '#4A382C',
                borderRadius: '4px',
              }}
              onClick={() => {
                setTechTab('earnings');
                fetchTechnicianEarnings();
              }}
            >
              <i className="bi bi-wallet2"></i>
              <span>Your Earnings</span>
              {parseFloat(technicianEarnings?.summary?.pending_payout || 0) > 0 && (
                <span
                  className="badge ms-1"
                  style={{ backgroundColor: '#A9793F', color: '#FFFDF9', borderRadius: '4px' }}
                >
                  ₹{technicianEarnings?.summary?.pending_payout}
                </span>
              )}
            </button>

            <button
              className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                backgroundColor: techTab === 'profile' ? '#5A3E2B' : 'transparent',
                color: techTab === 'profile' ? '#FFFDF9' : '#4A382C',
                borderRadius: '4px',
              }}
              onClick={() => setTechTab('profile')}
            >
              <i className="bi bi-person-badge"></i>
              <span>Technician Profile</span>
            </button>
          </div>

          {/* TAB 1: SERVICE REQUESTS */}
          {techTab === 'requests' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">Incoming Service Requests</h5>
                <button
                  onClick={fetchTechnicianData}
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loadingRequests}
                >
                  <i className={`bi bi-arrow-clockwise me-1 ${loadingRequests ? 'spin' : ''}`}></i> Refresh
                </button>
              </div>

              {loadingRequests ? (
                <CardSkeleton count={2} />
              ) : serviceRequests.length === 0 ? (
                <EmptyState
                  icon="bi-check-circle-fill"
                  title="No Pending Requests"
                  description="All service requests in your area have been reviewed. New requests will appear here automatically."
                />
              ) : (
                <div className="d-flex flex-column gap-3">
                  {serviceRequests.map((request) => {
                    const rec = request.recommendation || {};
                    const breakdown = rec.score_breakdown || {};
                    const isBreakdownOpen = Boolean(expandedBreakdowns[request.id]);

                    return (
                      <div className="hf-card" key={request.id}>
                        {/* Request Card Header */}
                        <div className="p-3 px-4 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-white text-primary border font-monospace fw-bold">
                              {request.booking_reference}
                            </span>
                            <UrgencyBadge urgency={request.urgency_level} />
                            <span className="badge bg-secondary-subtle text-dark border">
                              <i className={`bi ${request.service_icon || 'bi-tools'} me-1`}></i>
                              {request.service_name}
                            </span>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            {request.booking_status === 'customer_selected_technician' && (
                              <span className="badge bg-primary text-white">
                                <i className="bi bi-person-check-fill me-1"></i> Customer Selected You
                              </span>
                            )}
                            <span className="badge bg-success text-white fw-bold">
                              {rec.match_score || 85}% Match
                            </span>
                          </div>
                        </div>

                        {/* Request Card Body */}
                        <div className="p-4">
                          <h5 className="fw-bold text-dark mb-1">{request.problem_title}</h5>
                          <p className="text-secondary small mb-3">{request.problem_description}</p>

                          <div className="p-3 bg-light rounded-3 border mb-3">
                            <div className="row g-2 small">
                              <div className="col-12 col-sm-6">
                                <span className="text-muted d-block">Customer:</span>
                                <strong className="text-dark">
                                  <i className="bi bi-person me-1 text-primary"></i>
                                  {request.customer_name}
                                </strong>
                                <span className="d-block text-secondary">
                                  <i className="bi bi-telephone me-1 text-success"></i>
                                  +91 {request.customer_phone}
                                </span>
                              </div>

                              <div className="col-12 col-sm-6">
                                <span className="text-muted d-block">Scheduled Slot:</span>
                                <strong className="text-dark">
                                  <i className="bi bi-calendar-event me-1 text-primary"></i>
                                  {new Date(request.scheduled_date).toLocaleDateString()}
                                </strong>
                                <span className="d-block text-secondary">
                                  <i className="bi bi-clock me-1 text-primary"></i>
                                  {request.scheduled_time_slot}
                                </span>
                              </div>

                              <div className="col-12 pt-2 mt-2 border-top">
                                <span className="text-muted d-block">Service Address:</span>
                                <span className="text-dark">
                                  <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                                  {request.service_address}, {request.city} - {request.pincode}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Problem Photo & Voice */}
                          {request.problem_image_url && (
                            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-1 px-3 d-flex align-items-center gap-1"
                                onClick={() => setPreviewPhotoUrl(request.problem_image_url)}
                              >
                                <i className="bi bi-image"></i>
                                <span>View Problem Photo</span>
                              </button>
                              <img
                                src={getMediaUrl(request.problem_image_url)}
                                alt="Problem thumbnail"
                                className="rounded border shadow-xs"
                                style={{ width: '38px', height: '38px', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setPreviewPhotoUrl(request.problem_image_url)}
                                title="Click to view full photo"
                                onError={(e) => {
                                  const path = request.problem_image_url.startsWith('/') ? request.problem_image_url : `/${request.problem_image_url}`;
                                  if (!e.target.src.includes(':5000')) {
                                    e.target.src = `http://localhost:5000${path}`;
                                  }
                                }}
                              />
                            </div>
                          )}

                          {/* Voice Complaint Player */}
                          {(request.voice_complaint_url || request.voice_transcription) && (
                            <div className="p-3 bg-light rounded-3 border mb-3">
                              <span className="small fw-bold text-dark d-block mb-1">
                                <i className="bi bi-mic-fill text-danger me-1"></i> Customer Voice Complaint
                              </span>
                              {request.voice_complaint_url && (
                                <audio controls src={getMediaUrl(request.voice_complaint_url)} className="w-100 mb-2" />
                              )}
                              {request.voice_transcription && (
                                <div className="small text-secondary bg-white p-2 rounded border">
                                  <strong className="text-dark">Transcription: </strong>
                                  {request.voice_transcription}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Financials & Actions */}
                          <div className="d-flex justify-content-between align-items-center pt-3 border-top flex-wrap gap-2">
                            <div>
                              <span className="text-muted small d-block">Estimated Visiting Fee:</span>
                              <strong className="text-primary fs-5">₹{request.estimated_cost}</strong>
                            </div>

                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm px-3"
                                onClick={() => setRejectingBooking(request)}
                                disabled={actionLoadingId === request.id}
                              >
                                <i className="bi bi-x-circle me-1"></i> Decline
                              </button>
                              <button
                                type="button"
                                className={`btn ${technicianProfile?.verification_status !== 'verified' ? 'btn-secondary' : 'btn-success'} btn-sm px-4 fw-semibold shadow-xs`}
                                onClick={() => handleAccept(request.id, request.booking_reference)}
                                disabled={actionLoadingId === request.id || technicianProfile?.verification_status !== 'verified'}
                                title={technicianProfile?.verification_status !== 'verified' ? 'Verification is required before you can accept service requests.' : ''}
                              >
                                {actionLoadingId === request.id ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                    <span>Accepting...</span>
                                  </>
                                ) : technicianProfile?.verification_status !== 'verified' ? (
                                  <>
                                    <i className="bi bi-shield-lock me-1"></i> Verification Required
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-check2-circle me-1"></i> Accept Job
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

          {/* TAB 2: ACTIVE JOBS (LIFECYCLE & TOOLS/MATERIALS) */}
          {techTab === 'assigned' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className={`btn ${jobStatusFilter === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setJobStatusFilter('active')}
                    >
                      Active ({assignedJobs.filter((j) => ['accepted', 'in_progress'].includes(j.booking_status)).length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${jobStatusFilter === 'accepted' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setJobStatusFilter('accepted')}
                    >
                      Accepted ({assignedJobs.filter((j) => j.booking_status === 'accepted').length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${jobStatusFilter === 'in_progress' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setJobStatusFilter('in_progress')}
                    >
                      In Progress ({assignedJobs.filter((j) => j.booking_status === 'in_progress').length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${jobStatusFilter === 'completed' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setJobStatusFilter('completed')}
                    >
                      Completed ({assignedJobs.filter((j) => j.booking_status === 'completed').length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${jobStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setJobStatusFilter('all')}
                    >
                      All ({assignedJobs.length})
                    </button>
                  </div>
                </div>

                <button
                  onClick={fetchTechnicianData}
                  className="btn btn-outline-secondary btn-sm"
                  disabled={loadingJobs}
                >
                  <i className={`bi bi-arrow-clockwise me-1 ${loadingJobs ? 'spin' : ''}`}></i> Refresh
                </button>
              </div>

              {loadingJobs ? (
                <CardSkeleton count={2} />
              ) : assignedJobs.length === 0 ? (
                <EmptyState
                  icon="bi-briefcase"
                  title="No Active Jobs"
                  description="You currently do not have any accepted jobs. Go to 'Service Requests' to accept incoming appointments."
                />
              ) : (
                <div className="d-flex flex-column gap-3">
                  {assignedJobs
                    .filter((job) => {
                      if (jobStatusFilter === 'active') return ['accepted', 'in_progress'].includes(job.booking_status);
                      if (jobStatusFilter === 'accepted') return job.booking_status === 'accepted';
                      if (jobStatusFilter === 'in_progress') return job.booking_status === 'in_progress';
                      if (jobStatusFilter === 'completed') return job.booking_status === 'completed';
                      return true;
                    })
                    .map((job) => (
                      <div className="hf-card" key={job.id}>
                        {/* Header */}
                        <div className="p-3 px-4 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-white text-primary border font-monospace fw-bold">
                              {job.booking_reference}
                            </span>
                            <span className="badge bg-secondary-subtle text-dark border">
                              <i className={`bi ${job.service_icon || 'bi-tools'} me-1`}></i>
                              {job.service_name}
                            </span>
                          </div>
                          <StatusBadge status={job.booking_status} />
                        </div>

                        <div className="p-4">
                          <h5 className="fw-bold text-dark mb-1">{job.problem_title}</h5>
                          <p className="text-secondary small mb-3">{job.problem_description}</p>

                          {/* Customer & Location Details */}
                          <div className="p-3 bg-light rounded-3 border mb-3">
                            <div className="row g-2 small">
                              <div className="col-12 col-sm-6">
                                <span className="text-muted d-block">Customer:</span>
                                <strong className="text-dark">
                                  <i className="bi bi-person me-1 text-primary"></i>
                                  {job.customer_name}
                                </strong>
                                <span className="d-block">
                                  <a href={`tel:${job.customer_phone}`} className="text-decoration-none text-success fw-medium">
                                    <i className="bi bi-telephone-fill me-1"></i> +91 {job.customer_phone}
                                  </a>
                                </span>
                              </div>

                              <div className="col-12 col-sm-6">
                                <span className="text-muted d-block">Scheduled Slot:</span>
                                <strong className="text-dark">
                                  <i className="bi bi-calendar3 me-1 text-primary"></i>
                                  {new Date(job.scheduled_date).toLocaleDateString()}
                                </strong>
                                <span className="d-block text-secondary">
                                  <i className="bi bi-clock me-1 text-primary"></i> {job.scheduled_time_slot}
                                </span>
                              </div>

                              <div className="col-12 pt-2 mt-2 border-top">
                                <span className="text-muted d-block">Address:</span>
                                <span className="text-dark">
                                  <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                                  {job.service_address}, {job.city} - {job.pincode}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* SECTION 13: VISUAL LIFECYCLE PROGRESSION */}
                          <div className="p-3 bg-white rounded-3 border mb-3">
                            <span className="small text-muted fw-bold text-uppercase d-block mb-2">
                              Service Lifecycle Progress
                            </span>
                            <div className="hf-stepper my-2">
                              <div className="hf-step-item completed">
                                <div className="hf-step-circle">
                                  <i className="bi bi-check-lg"></i>
                                </div>
                                <span className="hf-step-label">Accepted</span>
                              </div>

                              <div className={`hf-step-item ${job.booking_status === 'in_progress' ? 'active' : job.booking_status === 'completed' ? 'completed' : ''}`}>
                                <div className="hf-step-circle">
                                  {job.booking_status === 'completed' ? <i className="bi bi-check-lg"></i> : '2'}
                                </div>
                                <span className="hf-step-label">In Progress</span>
                              </div>

                              <div className={`hf-step-item ${job.booking_status === 'completed' ? 'completed' : ''}`}>
                                <div className="hf-step-circle">
                                  {job.booking_status === 'completed' ? <i className="bi bi-check-lg"></i> : '3'}
                                </div>
                                <span className="hf-step-label">Completed</span>
                              </div>
                            </div>
                          </div>

                          {/* SECTION 14: TOOLS & MATERIALS RECOMMENDATIONS */}
                          <div className="p-3 bg-light rounded-3 border mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-1.5">
                                <i className="bi bi-tools text-primary"></i>
                                <strong className="small text-dark">Recommended Tools & Materials</strong>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.7rem' }}>
                                  Rule-Based Intelligence
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 text-muted"
                                onClick={() => fetchToolSuggestions(job.id, true)}
                                disabled={toolSuggestions[job.id]?.loading}
                              >
                                <i className={`bi bi-arrow-clockwise ${toolSuggestions[job.id]?.loading ? 'spin' : ''}`}></i>
                              </button>
                            </div>

                            {toolSuggestions[job.id]?.loading ? (
                              <div className="text-center py-2 small text-muted">
                                <span className="spinner-border spinner-border-sm me-2 text-primary"></span>
                                Matching trade tools & materials...
                              </div>
                            ) : (() => {
                              const rec = toolSuggestions[job.id]?.data || {};
                              const tradeKit = getStandardTradeKit(job.service_name || rec.category);
                              const tools = (rec.tools && rec.tools.length > 0) ? rec.tools : tradeKit.tools;
                              const materials = (rec.materials && rec.materials.length > 0) ? rec.materials : tradeKit.materials;
                              const safetyNote = rec.safety_guidelines || tradeKit.safetyNote;

                              return (
                                <div>
                                  <div className="row g-2 mb-2">
                                    {/* Recommended Tools */}
                                    <div className="col-12 col-md-6">
                                      <div className="p-2.5 bg-white rounded border h-100">
                                        <div className="fw-bold small text-dark mb-1 d-flex align-items-center justify-content-between">
                                          <span className="d-flex align-items-center gap-1">
                                            <i className="bi bi-wrench-adjustable text-primary"></i>
                                            <span>Recommended Tools</span>
                                          </span>
                                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{tools.length}</span>
                                        </div>
                                        <ul className="list-unstyled mb-0 small">
                                          {tools.map((t, idx) => (
                                            <li key={idx} className="mb-1">
                                              <strong className="text-dark">🔧 {t.name}</strong>
                                              {t.reason && <div className="text-muted ms-3" style={{ fontSize: '0.75rem' }}>Reason: {t.reason}</div>}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>

                                    {/* Recommended Materials */}
                                    <div className="col-12 col-md-6">
                                      <div className="p-2.5 bg-white rounded border h-100">
                                        <div className="fw-bold small text-dark mb-1 d-flex align-items-center justify-content-between">
                                          <span className="d-flex align-items-center gap-1">
                                            <i className="bi bi-box-seam text-info"></i>
                                            <span>Recommended Materials</span>
                                          </span>
                                          <span className="badge bg-info-subtle text-info border border-info-subtle">{materials.length}</span>
                                        </div>
                                        <ul className="list-unstyled mb-0 small">
                                          {materials.map((m, idx) => (
                                            <li key={idx} className="mb-1">
                                              <strong className="text-dark">📦 {m.name}</strong>
                                              {m.reason && <div className="text-muted ms-3" style={{ fontSize: '0.75rem' }}>Reason: {m.reason}</div>}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Safety Guidelines */}
                                  {safetyNote && (
                                    <div className="alert alert-warning py-2 px-3 rounded small mb-0 d-flex align-items-center gap-2">
                                      <i className="bi bi-shield-exclamation text-warning fs-5 flex-shrink-0"></i>
                                      <div>
                                        <strong className="text-dark d-block">Safety Guidelines:</strong>
                                        <span className="text-secondary">{safetyNote}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Lifecycle Action Buttons */}
                          {job.booking_status === 'accepted' && (
                            <div className="p-3 bg-primary-subtle rounded-3 border border-primary-subtle d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                              <div>
                                <strong className="text-primary d-block">Ready to Start Service?</strong>
                                <small className="text-secondary">Click below when you reach the customer location.</small>
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm px-4 fw-semibold shadow-xs"
                                onClick={() => handleStartService(job.id, job.booking_reference)}
                                disabled={actionLoadingId === job.id}
                              >
                                {actionLoadingId === job.id ? 'Starting...' : 'Start Service'}
                              </button>
                            </div>
                          )}

                          {job.booking_status === 'in_progress' && (
                            <div className="p-3 bg-info-subtle rounded-3 border border-info-subtle mb-3">
                              <label className="form-label small fw-semibold text-dark mb-1">
                                Service Notes (Work completed, parts replaced):
                              </label>
                              <textarea
                                className="form-control form-control-sm mb-2"
                                rows="2"
                                placeholder="e.g. Cleared clog, replaced sealing washer and tested water flow..."
                                value={serviceNotes[job.id] !== undefined ? serviceNotes[job.id] : (job.service_notes || '')}
                                onChange={(e) => setServiceNotes({ ...serviceNotes, [job.id]: e.target.value })}
                              ></textarea>
                              <div className="d-flex justify-content-end">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm px-4 fw-semibold shadow-xs"
                                  onClick={() => handleCompleteService(job.id, job.booking_reference)}
                                  disabled={actionLoadingId === job.id}
                                >
                                  {actionLoadingId === job.id ? 'Completing...' : 'Mark Completed'}
                                </button>
                              </div>
                            </div>
                          )}

                          {job.booking_status === 'completed' && (
                            <div className="alert alert-success d-flex align-items-center justify-content-between p-2.5 px-3 rounded-3 mb-3">
                              <div className="d-flex align-items-center gap-2 small">
                                <i className="bi bi-check2-all fs-4 text-success"></i>
                                <div>
                                  <strong className="text-success-emphasis">Service Successfully Completed</strong>
                                  {job.completed_at && (
                                    <small className="d-block text-muted">
                                      Finished on {new Date(job.completed_at).toLocaleString()}
                                    </small>
                                  )}
                                </div>
                              </div>
                              <span className="badge bg-success">
                                PAID / BILLED ₹{parseFloat(job.final_cost || 0) > 0 ? job.final_cost : (parseFloat(job.estimated_cost || 0) > 0 ? job.estimated_cost : (job.base_price || '249.00'))}
                              </span>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                            <div>
                              <span className="text-muted small d-block">Service Fee:</span>
                              <strong className="text-primary fs-5">
                                ₹{parseFloat(job.final_cost || 0) > 0 ? job.final_cost : (parseFloat(job.estimated_cost || 0) > 0 ? job.estimated_cost : (job.base_price || '249.00'))}
                              </strong>
                            </div>
                            <div className="d-flex gap-2">
                              {job.problem_image_url && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => setPreviewPhotoUrl(job.problem_image_url)}
                                >
                                  <i className="bi bi-image me-1"></i> Photo
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleViewTimeline(job.id)}
                                disabled={timelineLoading}
                              >
                                <i className="bi bi-clock-history me-1"></i> History
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
              {!technicianProfile ? (
                <div
                  className="p-5 text-center border"
                  style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
                >
                  <i className="bi bi-person-x fs-1 text-muted mb-2 d-block"></i>
                  <h5 className="fw-bold" style={{ color: '#3E3027' }}>Profile Not Found</h5>
                  <p className="text-muted small mb-0">Technician profile details could not be loaded.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-4">
                  {/* Technician Identity Card */}
                  <div
                    className="p-4 border shadow-sm"
                    style={{
                      backgroundColor: '#FFFDF9',
                      borderColor: '#D8C7B5',
                      borderRadius: '8px',
                    }}
                  >
                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                          style={{
                            width: '64px',
                            height: '64px',
                            fontSize: '1.6rem',
                            backgroundColor: '#5A3E2B',
                            color: '#FFFDF9',
                            boxShadow: '0 2px 6px rgba(90, 62, 43, 0.2)',
                          }}
                        >
                          {user.name ? user.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div>
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            <h4 className="fw-bold mb-0" style={{ color: '#3E3027' }}>{user.name}</h4>
                            {technicianProfile.verification_status === 'verified' ? (
                              <span
                                className="badge px-2 py-1 d-inline-flex align-items-center gap-1"
                                style={{ backgroundColor: '#2E7D32', color: '#FFFDF9', borderRadius: '4px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-patch-check-fill"></i> Verified Partner
                              </span>
                            ) : technicianProfile.verification_status === 'rejected' ? (
                              <span
                                className="badge px-2 py-1 d-inline-flex align-items-center gap-1"
                                style={{ backgroundColor: '#9A4F43', color: '#FFFDF9', borderRadius: '4px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-x-circle-fill"></i> Verification Rejected
                              </span>
                            ) : (
                              <span
                                className="badge px-2 py-1 d-inline-flex align-items-center gap-1"
                                style={{ backgroundColor: '#A9793F', color: '#FFFDF9', borderRadius: '4px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-hourglass-split"></i> Pending Verification
                              </span>
                            )}
                            <span
                              className="badge px-2 py-1 d-inline-flex align-items-center gap-1"
                              style={{
                                backgroundColor: '#F5EFE6',
                                color: '#5A3E2B',
                                border: '1px solid #D8C7B5',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <i className="bi bi-circle-fill text-success" style={{ fontSize: '0.45rem' }}></i>
                              {technicianProfile.availability_status === 'available' ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                          <div className="fw-medium small" style={{ color: '#7D5224' }}>
                            <i className={`bi ${technicianProfile.service_icon || 'bi-tools'} me-1`}></i>
                            {technicianProfile.service_name || 'Home Repairs'} Specialist
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-column align-items-md-end text-md-end">
                        <span className="small text-muted mb-1">Rating & Satisfaction</span>
                        <div className="d-flex align-items-center gap-1">
                          <span className="fs-4 fw-bold" style={{ color: '#A9793F' }}>
                            ★ {parseFloat(technicianProfile.average_rating || 0).toFixed(1)}
                          </span>
                          <span className="text-muted small">/ 5.0</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Location bar */}
                    <div className="row g-3 pt-3">
                      <div className="col-12 col-sm-4">
                        <span className="text-muted small d-block mb-1">Email Address</span>
                        <div className="d-flex align-items-center gap-2" style={{ color: '#3E3027' }}>
                          <i className="bi bi-envelope text-primary"></i>
                          <span className="fw-medium small">{user.email}</span>
                        </div>
                      </div>
                      <div className="col-12 col-sm-4">
                        <span className="text-muted small d-block mb-1">Phone Number</span>
                        <div className="d-flex align-items-center gap-2" style={{ color: '#3E3027' }}>
                          <i className="bi bi-telephone text-success"></i>
                          <span className="fw-medium small">+91 {user.phone}</span>
                        </div>
                      </div>
                      <div className="col-12 col-sm-4">
                        <span className="text-muted small d-block mb-1">Base Location</span>
                        <div className="d-flex align-items-center gap-2" style={{ color: '#3E3027' }}>
                          <i className="bi bi-geo-alt text-danger"></i>
                          <span className="fw-medium small">{technicianProfile.city || user.city || 'India'}{technicianProfile.pincode || user.pincode ? ` - ${technicianProfile.pincode || user.pincode}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {technicianProfile.bio && (
                      <div className="mt-3 pt-3 border-top">
                        <span className="text-muted small d-block mb-1">Professional Bio</span>
                        <p className="small mb-0 fst-italic" style={{ color: '#5A3E2B' }}>
                          "{technicianProfile.bio}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Profile Credentials Grid (2-Column Cards) */}
                  <div>
                    <h5 className="fw-bold mb-3" style={{ color: '#3E3027' }}>Professional Credentials & Rates</h5>
                    <div className="row g-3">
                      {/* 1. Specialization */}
                      <div className="col-12 col-md-6">
                        <div
                          className="p-4 h-100"
                          style={{
                            backgroundColor: '#FFFDF9',
                            border: '1px solid #D8C7B5',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              className="small text-uppercase fw-semibold"
                              style={{ color: '#7D5224', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                            >
                              Specialization
                            </span>
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{ width: '32px', height: '32px', backgroundColor: '#F5EFE6', color: '#5A3E2B' }}
                            >
                              <i className={`bi ${technicianProfile.service_icon || 'bi-tools'}`}></i>
                            </div>
                          </div>
                          <h5 className="fw-bold mb-1" style={{ color: '#3E3027' }}>
                            {technicianProfile.service_name || 'Home Repairs'}
                          </h5>
                          <p className="small text-muted mb-0">
                            Primary trade skill for customer bookings & diagnostic dispatch.
                          </p>
                        </div>
                      </div>

                      {/* 2. Experience */}
                      <div className="col-12 col-md-6">
                        <div
                          className="p-4 h-100"
                          style={{
                            backgroundColor: '#FFFDF9',
                            border: '1px solid #D8C7B5',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              className="small text-uppercase fw-semibold"
                              style={{ color: '#7D5224', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                            >
                              Experience
                            </span>
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{ width: '32px', height: '32px', backgroundColor: '#F5EFE6', color: '#5A3E2B' }}
                            >
                              <i className="bi bi-clock-history"></i>
                            </div>
                          </div>
                          <h5 className="fw-bold mb-1" style={{ color: '#3E3027' }}>
                            {technicianProfile.experience_years} Years
                          </h5>
                          <p className="small text-muted mb-0">
                            Hands-on experience in residential and commercial maintenance.
                          </p>
                        </div>
                      </div>

                      {/* 3. Visiting Fee / Hourly Rate */}
                      <div className="col-12 col-md-6">
                        <div
                          className="p-4 h-100"
                          style={{
                            backgroundColor: '#FFFDF9',
                            border: '1px solid #D8C7B5',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              className="small text-uppercase fw-semibold"
                              style={{ color: '#7D5224', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                            >
                              Visiting Fee / Hourly Rate
                            </span>
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{ width: '32px', height: '32px', backgroundColor: '#F5EFE6', color: '#5A3E2B' }}
                            >
                              <i className="bi bi-currency-rupee"></i>
                            </div>
                          </div>
                          <h5 className="fw-bold mb-1" style={{ color: '#5A3E2B' }}>
                            ₹{parseFloat(technicianProfile.visiting_charges || 0).toFixed(2)} / ₹{parseFloat(technicianProfile.hourly_rate || 0).toFixed(2)}
                          </h5>
                          <p className="small text-muted mb-0">
                            Base diagnostic visiting charge and standard hourly rate.
                          </p>
                        </div>
                      </div>

                      {/* 4. Average Rating */}
                      <div className="col-12 col-md-6">
                        <div
                          className="p-4 h-100"
                          style={{
                            backgroundColor: '#FFFDF9',
                            border: '1px solid #D8C7B5',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              className="small text-uppercase fw-semibold"
                              style={{ color: '#7D5224', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                            >
                              Average Rating
                            </span>
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{ width: '32px', height: '32px', backgroundColor: '#F5EFE6', color: '#A9793F' }}
                            >
                              <i className="bi bi-star-fill"></i>
                            </div>
                          </div>
                          <h5 className="fw-bold mb-1" style={{ color: '#A9793F' }}>
                            ★ {parseFloat(technicianProfile.average_rating || 0).toFixed(2)} / 5.0
                          </h5>
                          <p className="small text-muted mb-0">
                            Calculated from verified customer reviews and completed jobs.
                          </p>
                        </div>
                      </div>

                      {/* 5. Coverage Area */}
                      <div className="col-12 col-md-6">
                        <div
                          className="p-4 h-100"
                          style={{
                            backgroundColor: '#FFFDF9',
                            border: '1px solid #D8C7B5',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              className="small text-uppercase fw-semibold"
                              style={{ color: '#7D5224', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                            >
                              Coverage Area
                            </span>
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{ width: '32px', height: '32px', backgroundColor: '#F5EFE6', color: '#C62828' }}
                            >
                              <i className="bi bi-geo-alt-fill"></i>
                            </div>
                          </div>
                          <h5 className="fw-bold mb-1" style={{ color: '#3E3027' }}>
                            {technicianProfile.service_area || technicianProfile.city || 'Coverage Area'}
                          </h5>
                          <p className="small text-muted mb-0">
                            City: {technicianProfile.city || user.city || 'All Areas'} | PIN: {technicianProfile.pincode || user.pincode || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* 6. Qualification & Verification */}
                      <div className="col-12 col-md-6">
                        <div
                          className="p-4 h-100"
                          style={{
                            backgroundColor: '#FFFDF9',
                            border: '1px solid #D8C7B5',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              className="small text-uppercase fw-semibold"
                              style={{ color: '#7D5224', fontSize: '0.75rem', letterSpacing: '0.04em' }}
                            >
                              Qualification & Trust
                            </span>
                            <div
                              className="d-flex align-items-center justify-content-center rounded"
                              style={{ width: '32px', height: '32px', backgroundColor: '#F5EFE6', color: '#2E7D32' }}
                            >
                              <i className="bi bi-shield-check"></i>
                            </div>
                          </div>
                          <h5 className="fw-bold mb-1" style={{ color: '#3E3027' }}>
                            {technicianProfile.qualification || 'Certified Trade Technician'}
                          </h5>
                          <p className="small text-muted mb-0">
                            Status: <strong className="text-capitalize">{technicianProfile.verification_status || 'Pending'}</strong> • HOMEFIX Safety Checked
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: YOUR EARNINGS & PAYOUTS */}
          {techTab === 'earnings' && (
            <div>
              {/* Header */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h5 className="fw-bold text-dark mb-1">Your Earnings & Payout Status</h5>
                  <p className="text-secondary small mb-0">
                    Track gross earnings from completed jobs, platform fee breakdown, and payout settlement history.
                  </p>
                </div>
                <button
                  onClick={fetchTechnicianEarnings}
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
                  disabled={loadingEarnings}
                >
                  <i className={`bi bi-arrow-clockwise ${loadingEarnings ? 'spin' : ''}`}></i>
                  <span>Refresh</span>
                </button>
              </div>

              {/* Metric Cards Row */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                  <div className="hf-card p-3 border-start border-4 border-success h-100">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Total Net Earnings</span>
                      <div className="badge bg-success-subtle text-success p-2 rounded-circle">
                        <i className="bi bi-wallet2 fs-6"></i>
                      </div>
                    </div>
                    <div className="fs-3 fw-bold text-dark">
                      ₹{technicianEarnings?.summary?.total_earnings || '0.00'}
                    </div>
                    <div className="text-muted small mt-1">
                      From {technicianEarnings?.summary?.total_jobs_paid || 0} completed & paid services
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="hf-card p-3 border-start border-4 border-warning h-100">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Pending Payout</span>
                      <div className="badge bg-warning-subtle text-warning p-2 rounded-circle">
                        <i className="bi bi-hourglass-split fs-6"></i>
                      </div>
                    </div>
                    <div className="fs-3 fw-bold text-warning">
                      ₹{technicianEarnings?.summary?.pending_payout || '0.00'}
                    </div>
                    <div className="text-muted small mt-1">
                      Awaiting demo settlement by admin
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="hf-card p-3 border-start border-4 border-primary h-100">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Paid Out (Settled)</span>
                      <div className="badge bg-primary-subtle text-primary p-2 rounded-circle">
                        <i className="bi bi-check2-circle fs-6"></i>
                      </div>
                    </div>
                    <div className="fs-3 fw-bold text-primary">
                      ₹{technicianEarnings?.summary?.paid_out || '0.00'}
                    </div>
                    <div className="text-muted small mt-1">
                      Settled via demo payout references
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Notice Banner */}
              <div className="alert alert-light border shadow-xs rounded-3 p-3 mb-4 d-flex align-items-start gap-2.5">
                <i className="bi bi-info-circle-fill text-primary fs-5 mt-0.5"></i>
                <div className="small text-secondary">
                  <strong className="text-dark d-block mb-0.5">Platform Payout Policy:</strong>
                  For every completed service, a 10% platform fee is deducted and 90% is allocated to your earnings ledger. Admin settlement assigns an official payout reference number upon disbursement.
                </div>
              </div>

              {/* Earnings History Table */}
              <div className="hf-card p-4">
                <h6 className="fw-bold text-dark mb-3">Service Earnings & Payout History</h6>

                {loadingEarnings ? (
                  <TableRowSkeleton />
                ) : !technicianEarnings?.earnings || technicianEarnings.earnings.length === 0 ? (
                  <EmptyState
                    icon="bi-cash-coin"
                    title="No Earnings Records Found"
                    description="When customers complete payments for your serviced bookings, your net earnings and payout records will be automatically listed here."
                  />
                ) : (
                  <div className="hf-table-responsive">
                    <table className="hf-table">
                      <thead>
                        <tr>
                          <th>Booking & Service</th>
                          <th>Problem Title</th>
                          <th>Customer Paid</th>
                          <th>Platform Fee (10%)</th>
                          <th>Your Earnings (90%)</th>
                          <th>Payout Status</th>
                          <th>Settlement Ref</th>
                          <th>Paid Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicianEarnings.earnings.map((e) => (
                          <tr key={e.id}>
                            <td>
                              <div className="font-monospace text-primary fw-semibold small">
                                {e.booking_reference}
                              </div>
                              <div className="text-dark fw-medium small">{e.service_name}</div>
                            </td>
                            <td>
                              <div className="text-secondary small text-truncate" style={{ maxWidth: '180px' }}>
                                {e.problem_title || 'Service Completed'}
                              </div>
                            </td>
                            <td className="text-muted small">
                              ₹{parseFloat(e.gross_amount).toFixed(2)}
                            </td>
                            <td className="text-danger small">
                              -₹{parseFloat(e.platform_fee).toFixed(2)}
                            </td>
                            <td className="text-success fw-bold">
                              ₹{parseFloat(e.technician_amount).toFixed(2)}
                            </td>
                            <td>
                              {e.payout_status === 'paid' ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                  <i className="bi bi-check-circle-fill me-1"></i> Paid
                                </span>
                              ) : (
                                <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                                  <i className="bi bi-hourglass-split me-1"></i> Pending
                                </span>
                              )}
                            </td>
                            <td>
                              {e.payout_reference ? (
                                <span className="font-monospace small bg-light text-dark px-2 py-0.5 rounded border">
                                  {e.payout_reference}
                                </span>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                            <td className="text-muted small">
                              {e.paid_at
                                ? new Date(e.paid_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Pending admin payout'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom / Footer Navigation Area for Technician */}
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
      )}

      {/* =================================================================== */}
      {/* SECTION 16 & 17: ADMIN DASHBOARD */}
      {/* =================================================================== */}
      {user.role === 'admin' && (
        <div>
          {/* Top Metric Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-2">
              <div className="hf-stat-card p-3">
                <div>
                  <div className="hf-stat-val text-primary">{adminStats?.customers?.total ?? 0}</div>
                  <div className="hf-stat-label">Users</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <div className="hf-stat-card p-3">
                <div>
                  <div className="hf-stat-val text-warning">
                    {adminTechnicians.length > 0 ? adminTechnicians.length : (adminStats?.technicians?.total ?? 0)}
                  </div>
                  <div className="hf-stat-label">Technicians</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <div className="hf-stat-card p-3">
                <div>
                  <div className="hf-stat-val text-info">{adminStats?.bookings?.total ?? 0}</div>
                  <div className="hf-stat-label">Bookings</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <div className="hf-stat-card p-3">
                <div>
                  <div className="hf-stat-val text-success">{adminStats?.bookings?.completed ?? 0}</div>
                  <div className="hf-stat-label">Completed</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <div className="hf-stat-card p-3">
                <div>
                  <div className="hf-stat-val text-success">
                    {adminStats?.payments?.paid_count ?? adminStats?.payments?.paid_transactions ?? adminStats?.paidPayments ?? (adminPayments?.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed')?.length || 0)}
                  </div>
                  <div className="hf-stat-label">Payments</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-2">
              <div className="hf-stat-card p-3">
                <div>
                  <div className="hf-stat-val text-danger">{adminStats?.technicians?.pending_verification ?? 0}</div>
                  <div className="hf-stat-label">Pending Verify</div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Navigation Pills */}
          <div
            className="d-flex p-1 border mb-4 overflow-auto gap-1"
            style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '6px' }}
            role="tablist"
          >
            {[
              { key: 'overview', label: 'System Overview', icon: 'bi-speedometer2' },
              { key: 'customers', label: 'Customers', icon: 'bi-people' },
              { key: 'technicians', label: 'Technicians', icon: 'bi-tools' },
              { key: 'bookings', label: 'Bookings', icon: 'bi-calendar-check' },
              { key: 'payments', label: 'Payments', icon: 'bi-credit-card' },
              { key: 'payouts', label: 'Technician Payouts', icon: 'bi-wallet2' },
              { key: 'reviews', label: 'Reviews', icon: 'bi-star' },
            ].map((tab) => (
              <button
                key={tab.key}
                className="btn btn-sm py-2 px-3 fw-semibold border-0 text-nowrap"
                style={{
                  backgroundColor: adminTab === tab.key ? '#5A3E2B' : 'transparent',
                  color: adminTab === tab.key ? '#FFFDF9' : '#4A382C',
                  borderRadius: '4px',
                }}
                onClick={() => setAdminTab(tab.key)}
              >
                <i className={`bi ${tab.icon} me-1.5`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Feedback & Error */}
          {adminFeedback.message && (
            <div className={`alert alert-${adminFeedback.type} alert-dismissible fade show rounded-3 mb-4 d-flex align-items-center gap-2 shadow-xs`} role="alert">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <div>{adminFeedback.message}</div>
              <button type="button" className="btn-close" onClick={() => setAdminFeedback({ type: '', message: '' })}></button>
            </div>
          )}

          {/* ADMIN TAB 1: OVERVIEW */}
          {adminTab === 'overview' && (
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <div className="hf-card p-4 h-100">
                  <h6 className="fw-bold text-dark mb-3">Booking Status Breakdown</h6>
                  {adminStats?.bookings ? (
                    <div className="d-flex flex-column gap-2 small">
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>Pending Assignment:</span>
                        <strong className="text-warning">{adminStats.bookings.pending ?? 0}</strong>
                      </div>
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>In Progress / Active:</span>
                        <strong className="text-info">{adminStats.bookings.in_progress ?? 0}</strong>
                      </div>
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>Completed Services:</span>
                        <strong className="text-success">{adminStats.bookings.completed ?? 0}</strong>
                      </div>
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>Cancelled / Declined:</span>
                        <strong className="text-danger">{adminStats.bookings.cancelled ?? 0}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted small">Loading statistics...</p>
                  )}
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="hf-card p-4 h-100">
                  <h6 className="fw-bold text-dark mb-3">Financial & Platform Metrics</h6>
                  {adminStats?.payments ? (
                    <div className="d-flex flex-column gap-2 small">
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>Total Processed Volume:</span>
                        <strong className="text-success fs-6">
                          ₹{parseFloat(adminStats?.payments?.total_amount ?? adminStats?.payments?.total_revenue ?? adminStats?.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>Settled Payments:</span>
                        <strong className="text-dark">
                          {adminStats?.payments?.paid_count ?? adminStats?.payments?.paid_transactions ?? adminStats?.paidPayments ?? 0}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between p-2 bg-light rounded">
                        <span>Pending Collections:</span>
                        <strong className="text-warning">
                          {adminStats?.payments?.pending_count ?? adminStats?.payments?.pending_transactions ?? adminStats?.pendingPayments ?? 0}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted small">Loading metrics...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ADMIN TAB 2: CUSTOMERS */}
          {adminTab === 'customers' && (
            <div className="hf-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="fw-bold text-dark mb-0">Customer Directory</h5>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ maxWidth: '240px' }}
                  placeholder="Search customer name..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && fetchAdminCustomers()}
                />
              </div>

              {loadingAdmin ? (
                <TableRowSkeleton />
              ) : (
                <div className="hf-table-responsive">
                  <table className="hf-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>City</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminCustomers.map((cust) => (
                        <tr key={cust.id}>
                          <td className="text-muted small">#{cust.id}</td>
                          <td className="fw-semibold text-dark">{cust.name}</td>
                          <td className="text-secondary small">{cust.email}</td>
                          <td className="text-secondary small">+91 {cust.phone}</td>
                          <td className="small">{cust.city || 'Bangalore'}</td>
                          <td>
                            <span className={`badge ${cust.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                              {cust.status}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm py-0.5 px-2"
                                onClick={() => handleViewCustomer(cust.id)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-0.5 px-2"
                                onClick={() => handleToggleCustomerStatus(cust)}
                                disabled={actionLoadingTechId === `cust-${cust.id}`}
                              >
                                {actionLoadingTechId === `cust-${cust.id}` ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : cust.status === 'active' ? (
                                  'Deactivate'
                                ) : (
                                  'Activate'
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm py-0.5 px-2"
                                onClick={() => setDeletingCustomer(cust)}
                                disabled={actionLoadingTechId === `delete-cust-${cust.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB 3: TECHNICIANS */}
          {adminTab === 'technicians' && (
            <div className="hf-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="fw-bold text-dark mb-0">Technicians Directory & Verification</h5>
                <div className="d-flex gap-2">
                  <select
                    className="form-select form-select-sm"
                    value={techVerificationFilter}
                    onChange={(e) => setTechVerificationFilter(e.target.value)}
                  >
                    <option value="all">All Verification</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {loadingAdmin ? (
                <TableRowSkeleton />
              ) : (
                <div className="hf-table-responsive">
                  <table className="hf-table">
                    <thead>
                      <tr>
                        <th>Technician</th>
                        <th>Trade</th>
                        <th>Experience</th>
                        <th>Visiting Fee</th>
                        <th>Rating</th>
                        <th>Verification</th>
                        <th>Account Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminTechnicians.map((tech) => (
                        <tr key={tech.id}>
                          <td>
                            <strong className="text-dark d-block">{tech.name}</strong>
                            <small className="text-muted">+91 {tech.phone}</small>
                          </td>
                          <td className="fw-medium">{tech.service_name || 'General'}</td>
                          <td className="small">{tech.experience_years} Years</td>
                          <td className="text-primary fw-semibold">₹{tech.visiting_charges}</td>
                          <td>
                            <span className="badge bg-warning text-dark">★ {tech.average_rating || '5.0'}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              tech.verification_status === 'verified'
                                ? 'bg-success'
                                : tech.verification_status === 'rejected'
                                ? 'bg-danger'
                                : 'bg-warning text-dark'
                            }`}>
                              {tech.verification_status}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              (tech.account_status || tech.status) === 'active'
                                ? 'bg-success'
                                : (tech.account_status || tech.status) === 'suspended'
                                ? 'bg-danger'
                                : 'bg-secondary'
                            }`}>
                              {tech.account_status || tech.status || 'active'}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              {tech.verification_status !== 'verified' && (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm py-0.5 px-2"
                                  onClick={() => handleVerifyTechnician(tech.id, 'verified')}
                                  disabled={actionLoadingTechId === `verify-${tech.id}`}
                                >
                                  Verify
                                </button>
                              )}
                              {tech.verification_status !== 'rejected' && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm py-0.5 px-2"
                                  onClick={() => setRejectingTech(tech)}
                                  disabled={actionLoadingTechId === `verify-${tech.id}`}
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                type="button"
                                className={`btn ${
                                  (tech.account_status || tech.status) === 'active'
                                    ? 'btn-outline-warning'
                                    : 'btn-outline-success'
                                } btn-sm py-0.5 px-2`}
                                onClick={() => handleToggleTechnicianStatus(tech)}
                                disabled={actionLoadingTechId === `tech-status-${tech.id}`}
                              >
                                {actionLoadingTechId === `tech-status-${tech.id}` ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (tech.account_status || tech.status) === 'active' ? (
                                  'Deactivate'
                                ) : (
                                  'Activate'
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm py-0.5 px-2"
                                onClick={() => setDeletingTechnician(tech)}
                                disabled={actionLoadingTechId === `delete-tech-${tech.id}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB 4: BOOKINGS */}
          {adminTab === 'bookings' && (
            <div className="hf-card p-4">
              <h5 className="fw-bold text-dark mb-3">Master Bookings Ledger</h5>
              {loadingAdmin ? (
                <TableRowSkeleton />
              ) : (
                <div className="hf-table-responsive">
                  <table className="hf-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Customer</th>
                        <th>Technician</th>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminBookings.map((b) => (
                        <tr key={b.id}>
                          <td className="font-monospace text-primary fw-bold">{b.booking_reference}</td>
                          <td className="fw-medium">{b.customer_name}</td>
                          <td className="text-secondary">{b.technician_name || 'Unassigned'}</td>
                          <td>{b.service_name}</td>
                          <td className="small text-muted">{new Date(b.scheduled_date).toLocaleDateString()}</td>
                          <td>
                            <StatusBadge status={b.booking_status} />
                          </td>
                          <td className="fw-semibold">₹{b.final_cost || b.estimated_cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB 5: PAYMENTS */}
          {adminTab === 'payments' && (
            <div className="hf-card p-4">
              <h5 className="fw-bold text-dark mb-3">Platform Payments Ledger</h5>
              {loadingAdmin ? (
                <TableRowSkeleton />
              ) : (
                <div className="hf-table-responsive">
                  <table className="hf-table">
                    <thead>
                      <tr>
                        <th>Txn Reference</th>
                        <th>Booking Ref</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="font-monospace text-muted small">{p.razorpay_payment_id || `TXN-${p.id}`}</td>
                          <td className="font-monospace text-primary fw-semibold">{p.booking_reference}</td>
                          <td>{p.customer_name}</td>
                          <td className="text-success fw-bold">₹{p.amount}</td>
                          <td>
                            <span className="badge bg-light text-dark border text-uppercase">{p.payment_method || 'demo'}</span>
                          </td>
                          <td>
                            <span className="badge bg-success">{p.payment_status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB: TECHNICIAN PAYOUTS */}
          {adminTab === 'payouts' && (
            <div>
              {/* Header */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h5 className="fw-bold text-dark mb-1">Technician Payouts & Commission Settlement</h5>
                  <p className="text-secondary small mb-0">
                    Audit collected payments, platform commission (10%), and settle technician disbursements.
                  </p>
                </div>
                <button
                  onClick={fetchAdminPayouts}
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
                  disabled={loadingAdmin}
                >
                  <i className={`bi bi-arrow-clockwise ${loadingAdmin ? 'spin' : ''}`}></i>
                  <span>Refresh</span>
                </button>
              </div>

              {/* Top Summary Cards */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="hf-card p-3 border-start border-4 border-primary h-100">
                    <span className="text-muted small fw-medium d-block mb-1">Total Gross Revenue</span>
                    <div className="fs-4 fw-bold text-dark">
                      ₹{adminPayouts?.summary?.total_gross || '0.00'}
                    </div>
                    <span className="text-muted small">Total customer payments</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="hf-card p-3 border-start border-4 border-info h-100">
                    <span className="text-muted small fw-medium d-block mb-1">Platform Commission (10%)</span>
                    <div className="fs-4 fw-bold text-info">
                      ₹{adminPayouts?.summary?.total_platform_fees || '0.00'}
                    </div>
                    <span className="text-muted small">Retained platform fees</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="hf-card p-3 border-start border-4 border-warning h-100">
                    <span className="text-muted small fw-medium d-block mb-1">Pending Technician Payouts</span>
                    <div className="fs-4 fw-bold text-warning">
                      ₹{adminPayouts?.summary?.total_pending_payout || '0.00'}
                    </div>
                    <span className="text-muted small">Awaiting settlement</span>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="hf-card p-3 border-start border-4 border-success h-100">
                    <span className="text-muted small fw-medium d-block mb-1">Total Paid Out</span>
                    <div className="fs-4 fw-bold text-success">
                      ₹{adminPayouts?.summary?.total_paid_out || '0.00'}
                    </div>
                    <span className="text-muted small">Settled via demo payouts</span>
                  </div>
                </div>
              </div>

              {/* Demo Notice Banner */}
              <div className="alert alert-light border shadow-xs rounded-3 p-3 mb-4 d-flex align-items-start gap-2.5">
                <i className="bi bi-info-circle-fill text-primary fs-5 mt-0.5"></i>
                <div className="small text-secondary">
                  <strong className="text-dark d-block mb-0.5">Payout Settlement Console:</strong>
                  When you click <strong>Mark as Paid</strong>, the system generates an auditable payout reference and marks the record as settled in the system ledger.
                </div>
              </div>

              {/* Main Payouts Table Card */}
              <div className="hf-card p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                  <h6 className="fw-bold text-dark mb-0">Technician Payout Records</h6>

                  {/* Filter controls */}
                  <div className="d-flex align-items-center gap-2">
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn ${payoutStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setPayoutStatusFilter('all')}
                      >
                        All ({adminPayouts?.payouts?.length || 0})
                      </button>
                      <button
                        type="button"
                        className={`btn ${payoutStatusFilter === 'pending' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setPayoutStatusFilter('pending')}
                      >
                        Pending ({adminPayouts?.payouts?.filter((p) => p.payout_status === 'pending').length || 0})
                      </button>
                      <button
                        type="button"
                        className={`btn ${payoutStatusFilter === 'paid' ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => setPayoutStatusFilter('paid')}
                      >
                        Paid ({adminPayouts?.payouts?.filter((p) => p.payout_status === 'paid').length || 0})
                      </button>
                    </div>

                    <div className="input-group input-group-sm" style={{ width: '220px' }}>
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search technician or ref..."
                        value={payoutSearch}
                        onChange={(e) => setPayoutSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {loadingAdmin ? (
                  <TableRowSkeleton />
                ) : (() => {
                  const filteredPayouts = (adminPayouts?.payouts || []).filter((p) => {
                    const matchesStatus =
                      payoutStatusFilter === 'all' || p.payout_status === payoutStatusFilter;
                    const matchesSearch =
                      !payoutSearch ||
                      p.technician_name?.toLowerCase().includes(payoutSearch.toLowerCase()) ||
                      p.booking_reference?.toLowerCase().includes(payoutSearch.toLowerCase()) ||
                      p.payout_reference?.toLowerCase().includes(payoutSearch.toLowerCase());
                    return matchesStatus && matchesSearch;
                  });

                  if (filteredPayouts.length === 0) {
                    return (
                      <EmptyState
                        icon="bi-wallet2"
                        title="No Payout Records Found"
                        description="Completed bookings that have been paid will show up here for technician payout settlement."
                      />
                    );
                  }

                  return (
                    <div className="hf-table-responsive">
                      <table className="hf-table">
                        <thead>
                          <tr>
                            <th>Payout ID</th>
                            <th>Technician</th>
                            <th>Booking Ref</th>
                            <th>Gross Paid</th>
                            <th>Platform Fee (10%)</th>
                            <th>Tech Payout (90%)</th>
                            <th>Status</th>
                            <th>Settlement Details</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayouts.map((p) => (
                            <tr key={p.id}>
                              <td className="font-monospace small text-muted">#{p.id}</td>
                              <td>
                                <div className="fw-semibold text-dark small">{p.technician_name}</div>
                                <div className="text-muted small">{p.technician_phone || p.technician_email}</div>
                              </td>
                              <td>
                                <div className="font-monospace text-primary fw-semibold small">
                                  {p.booking_reference}
                                </div>
                                <div className="text-muted small">{p.service_name}</div>
                              </td>
                              <td className="small text-muted">₹{parseFloat(p.gross_amount).toFixed(2)}</td>
                              <td className="small text-danger">-₹{parseFloat(p.platform_fee).toFixed(2)}</td>
                              <td className="fw-bold text-success">
                                ₹{parseFloat(p.technician_amount).toFixed(2)}
                              </td>
                              <td>
                                {p.payout_status === 'paid' ? (
                                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                    <i className="bi bi-check-circle-fill me-1"></i> Paid
                                  </span>
                                ) : (
                                  <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                                    <i className="bi bi-hourglass-split me-1"></i> Pending
                                  </span>
                                )}
                              </td>
                              <td>
                                {p.payout_reference ? (
                                  <div>
                                    <div className="font-monospace small bg-light text-dark px-1.5 py-0.5 rounded border d-inline-block">
                                      {p.payout_reference}
                                    </div>
                                    <div className="text-muted small mt-0.5">
                                      {new Date(p.paid_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted small">—</span>
                                )}
                              </td>
                              <td className="text-end">
                                {p.payout_status === 'pending' ? (
                                  <button
                                    className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 shadow-xs"
                                    onClick={() => handleMarkPayoutPaid(p.id)}
                                    disabled={payoutActionLoadingId === p.id}
                                    title="Mark this payout as settled (Demo)"
                                  >
                                    {payoutActionLoadingId === p.id ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                        <span>Processing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <i className="bi bi-check-circle"></i>
                                        <span>Mark as Paid</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-muted small d-inline-flex align-items-center gap-1">
                                    <i className="bi bi-check-all text-success fs-6"></i>
                                    <span>Settled</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ADMIN TAB 6: REVIEWS */}
          {adminTab === 'reviews' && (
            <div className="hf-card p-4">
              <h5 className="fw-bold text-dark mb-3">Customer Ratings & Reviews</h5>
              {loadingAdmin ? (
                <TableRowSkeleton />
              ) : (
                <div className="d-flex flex-column gap-2">
                  {adminReviews.map((rev) => (
                    <div className="p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center" key={rev.id}>
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <strong className="text-dark">{rev.customer_name}</strong>
                          <span className="text-muted small">&bull; Technician: {rev.technician_name}</span>
                          <span className="badge bg-warning text-dark">★ {rev.rating}/5</span>
                        </div>
                        <p className="text-secondary small mb-0 fst-italic">"{rev.review_comment}"</p>
                      </div>
                      <small className="text-muted">{new Date(rev.created_at).toLocaleDateString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom / Footer Navigation Area for Admin */}
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
      )}

      {/* TECHNICIAN DECLINE MODAL */}
      {rejectingBooking && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-danger text-white py-3 px-4">
                <h5 className="modal-title fw-bold mb-0">Decline Service Request</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setRejectingBooking(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary small mb-3">
                  Please specify why you are declining booking {rejectingBooking.booking_reference}:
                </p>
                <select
                  className="form-select mb-3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="Schedule conflict">Schedule conflict</option>
                  <option value="Outside service radius">Outside service radius</option>
                  <option value="Parts not available">Required parts not in stock</option>
                  <option value="Other">Other reason</option>
                </select>

                {rejectReason === 'Other' && (
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  ></textarea>
                )}
              </div>
              <div className="modal-footer bg-light p-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setRejectingBooking(null)}
                  disabled={actionLoadingId === rejectingBooking.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4 fw-semibold"
                  onClick={handleConfirmReject}
                  disabled={actionLoadingId === rejectingBooking.id}
                >
                  {actionLoadingId === rejectingBooking.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      <span>Declining...</span>
                    </>
                  ) : (
                    'Confirm Decline'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TECHNICIAN VERIFICATION REJECTION MODAL */}
      {rejectingTech && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-danger text-white py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-x fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Reject Technician Verification</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setRejectingTech(null)}
                  disabled={actionLoadingTechId === `verify-${rejectingTech.id}`}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary small mb-3">
                  You are rejecting verification for technician <strong>{rejectingTech.name}</strong> ({rejectingTech.service_name || 'General'}). Please specify the reason:
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark mb-1">Reason for Rejection</label>
                  <select
                    className="form-select"
                    value={techRejectReason}
                    onChange={(e) => setTechRejectReason(e.target.value)}
                  >
                    <option value="Documents could not be verified">Documents could not be verified</option>
                    <option value="Incomplete profile or missing trade certificate">Incomplete profile or missing trade certificate</option>
                    <option value="Outside service coverage area">Outside service coverage area</option>
                    <option value="Failed background / identity check">Failed background / identity check</option>
                    <option value="Other">Other reason</option>
                  </select>
                </div>

                {techRejectReason === 'Other' && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark mb-1">Custom Reason</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Enter detailed reason for rejection..."
                      value={techRejectCustomReason}
                      onChange={(e) => setTechRejectCustomReason(e.target.value)}
                    ></textarea>
                  </div>
                )}

                <div className="alert alert-warning py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 text-warning"></i>
                  <span>The technician will not be able to accept customer service requests while rejected.</span>
                </div>
              </div>
              <div className="modal-footer bg-light p-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setRejectingTech(null)}
                  disabled={actionLoadingTechId === `verify-${rejectingTech.id}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4 fw-semibold"
                  onClick={handleConfirmRejectTechnician}
                  disabled={actionLoadingTechId === `verify-${rejectingTech.id}`}
                >
                  {actionLoadingTechId === `verify-${rejectingTech.id}` ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DELETE CUSTOMER CONFIRMATION MODAL */}
      {deletingCustomer && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-danger text-white py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-trash-fill fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Delete Customer Account</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeletingCustomer(null)}
                  disabled={actionLoadingTechId === `delete-cust-${deletingCustomer.id}`}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary mb-3">
                  Are you sure you want to permanently delete customer <strong>{deletingCustomer.name}</strong> ({deletingCustomer.email})?
                </p>
                <div className="alert alert-danger py-2 px-3 small mb-0 d-flex align-items-start gap-2">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 text-danger mt-0.5"></i>
                  <div>
                    <strong>Warning:</strong> This action cannot be undone. All bookings, service history, and payments associated with this user will be permanently removed.
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light p-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setDeletingCustomer(null)}
                  disabled={actionLoadingTechId === `delete-cust-${deletingCustomer.id}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4 fw-semibold"
                  onClick={handleConfirmDeleteCustomer}
                  disabled={actionLoadingTechId === `delete-cust-${deletingCustomer.id}`}
                >
                  {actionLoadingTechId === `delete-cust-${deletingCustomer.id}` ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DELETE TECHNICIAN CONFIRMATION MODAL */}
      {deletingTechnician && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-danger text-white py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-person-x-fill fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Delete Technician Account</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeletingTechnician(null)}
                  disabled={actionLoadingTechId === `delete-tech-${deletingTechnician.id}`}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary mb-3">
                  Are you sure you want to permanently delete technician <strong>{deletingTechnician.name}</strong> ({deletingTechnician.service_name || 'General'})?
                </p>
                <div className="alert alert-danger py-2 px-3 small mb-0 d-flex align-items-start gap-2">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 text-danger mt-0.5"></i>
                  <div>
                    <strong>Warning:</strong> This will delete this technician's profile and user account from the platform. Any assigned bookings will be unassigned.
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light p-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setDeletingTechnician(null)}
                  disabled={actionLoadingTechId === `delete-tech-${deletingTechnician.id}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4 fw-semibold"
                  onClick={handleConfirmDeleteTechnician}
                  disabled={actionLoadingTechId === `delete-tech-${deletingTechnician.id}`}
                >
                  {actionLoadingTechId === `delete-tech-${deletingTechnician.id}` ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TECHNICIAN SERVICE TIMELINE / HISTORY MODAL */}
      {selectedTimelineBooking && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-light border-bottom p-4">
                <div>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace mb-1">
                    {selectedTimelineBooking.booking?.booking_reference || 'Booking'}
                  </span>
                  <h5 className="modal-title fw-bold text-dark mb-0">Service Lifecycle & Progression History</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedTimelineBooking(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Summary Card */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="row g-3 small">
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Service Trade:</span>
                      <strong className="text-dark fs-6">{selectedTimelineBooking.booking?.service_name}</strong>
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Current Status:</span>
                      <StatusBadge status={selectedTimelineBooking.booking?.booking_status} />
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Customer:</span>
                      <strong className="text-dark">{selectedTimelineBooking.booking?.customer_name}</strong>
                      {selectedTimelineBooking.booking?.customer_phone && (
                        <span className="text-secondary ms-1">(+91 {selectedTimelineBooking.booking.customer_phone})</span>
                      )}
                    </div>
                    <div className="col-12 col-md-6">
                      <span className="text-muted d-block">Scheduled Appointment:</span>
                      <span className="text-dark">
                        {selectedTimelineBooking.booking?.scheduled_date
                          ? new Date(selectedTimelineBooking.booking.scheduled_date).toLocaleDateString()
                          : 'N/A'}{' '}
                        ({selectedTimelineBooking.booking?.scheduled_time_slot || 'Standard'})
                      </span>
                    </div>
                    {selectedTimelineBooking.booking?.problem_description && (
                      <div className="col-12 pt-2 border-top">
                        <span className="text-muted d-block">Complaint Details:</span>
                        <p className="text-secondary mb-0">{selectedTimelineBooking.booking.problem_description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status History Timeline */}
                <h6 className="fw-bold text-dark mb-3">Status Audit Logs</h6>
                {selectedTimelineBooking.statusHistory && selectedTimelineBooking.statusHistory.length > 0 ? (
                  <ul className="list-group list-group-flush border rounded-3 mb-0">
                    {selectedTimelineBooking.statusHistory.map((log, idx) => (
                      <li
                        className="list-group-item d-flex justify-content-between align-items-center py-3"
                        key={log.id || idx}
                      >
                        <div>
                          <StatusBadge status={log.status} />
                          <p className="mb-0 mt-1 small text-dark fw-medium">{log.remarks}</p>
                          <small className="text-muted">
                            Updated by {log.changed_by_name} ({log.changed_by_role})
                          </small>
                        </div>
                        <small className="text-secondary">{new Date(log.logged_at).toLocaleString()}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted small fst-italic mb-0">No timeline events recorded yet.</p>
                )}
              </div>

              <div className="modal-footer bg-light p-3">
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

      {/* ADMIN CUSTOMER DETAILS MODAL */}
      {viewCustomerModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-light border-bottom p-4">
                <div>
                  <span className="badge bg-secondary-subtle text-secondary font-monospace mb-1">
                    Customer #{viewCustomerModal.customer?.id}
                  </span>
                  <h5 className="modal-title fw-bold text-dark mb-0">
                    {viewCustomerModal.customer?.name}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setViewCustomerModal(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {viewCustomerModal.loading ? (
                  <div className="text-center py-5">
                    <span className="spinner-border text-primary" role="status"></span>
                    <p className="text-muted small mt-2">Loading customer records...</p>
                  </div>
                ) : (
                  <>
                    {/* Customer Profile Grid */}
                    <div className="p-3 bg-light rounded-3 border mb-4">
                      <div className="row g-3 small">
                        <div className="col-12 col-md-4">
                          <span className="text-muted d-block">Email:</span>
                          <strong className="text-dark">{viewCustomerModal.customer?.email}</strong>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted d-block">Phone:</span>
                          <strong className="text-dark">+91 {viewCustomerModal.customer?.phone}</strong>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted d-block">Account Status:</span>
                          <span
                            className={`badge ${
                              viewCustomerModal.customer?.status === 'active' ? 'bg-success' : 'bg-secondary'
                            }`}
                          >
                            {viewCustomerModal.customer?.status}
                          </span>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted d-block">City & Pincode:</span>
                          <span className="text-dark">
                            {viewCustomerModal.customer?.city || 'Bangalore'} -{' '}
                            {viewCustomerModal.customer?.pincode || '560001'}
                          </span>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted d-block">Address:</span>
                          <span className="text-dark">{viewCustomerModal.customer?.address || 'Not specified'}</span>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted d-block">Member Since:</span>
                          <span className="text-dark">
                            {viewCustomerModal.customer?.created_at
                              ? new Date(viewCustomerModal.customer.created_at).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bookings Section */}
                    <h6 className="fw-bold text-dark mb-2">Service Bookings ({viewCustomerModal.bookings?.length || 0})</h6>
                    {viewCustomerModal.bookings && viewCustomerModal.bookings.length > 0 ? (
                      <div className="table-responsive border rounded-3 mb-4">
                        <table className="table table-hover align-middle mb-0 small">
                          <thead className="table-light">
                            <tr>
                              <th>Ref</th>
                              <th>Service</th>
                              <th>Technician</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Fee</th>
                              <th>Payment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewCustomerModal.bookings.map((b) => (
                              <tr key={b.id}>
                                <td className="font-monospace text-primary fw-bold">{b.booking_reference}</td>
                                <td>{b.service_name}</td>
                                <td className="text-secondary">{b.technician_name || 'Unassigned'}</td>
                                <td>{b.scheduled_date ? new Date(b.scheduled_date).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                  <StatusBadge status={b.booking_status} />
                                </td>
                                <td className="fw-semibold">₹{b.final_cost || b.estimated_cost}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      b.payment_status === 'completed'
                                        ? 'bg-success'
                                        : b.payment_status === 'pending'
                                        ? 'bg-warning text-dark'
                                        : 'bg-secondary'
                                    }`}
                                  >
                                    {b.payment_status || 'unpaid'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted small fst-italic mb-4">No bookings made by this customer.</p>
                    )}

                    {/* Payments History */}
                    <h6 className="fw-bold text-dark mb-2">Payment Transactions ({viewCustomerModal.payments?.length || 0})</h6>
                    {viewCustomerModal.payments && viewCustomerModal.payments.length > 0 ? (
                      <div className="table-responsive border rounded-3 mb-0">
                        <table className="table table-hover align-middle mb-0 small">
                          <thead className="table-light">
                            <tr>
                              <th>ID</th>
                              <th>Booking Ref</th>
                              <th>Amount</th>
                              <th>Method</th>
                              <th>Status</th>
                              <th>Paid At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewCustomerModal.payments.map((p) => (
                              <tr key={p.id}>
                                <td className="font-monospace text-muted">#{p.id}</td>
                                <td className="font-monospace text-primary">{p.booking_reference}</td>
                                <td className="fw-bold text-success">₹{p.amount}</td>
                                <td className="text-uppercase">{p.payment_method || 'Razorpay'}</td>
                                <td>
                                  <span className={`badge ${p.payment_status === 'completed' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                    {p.payment_status}
                                  </span>
                                </td>
                                <td className="text-muted">{p.paid_at ? new Date(p.paid_at).toLocaleString() : 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted small fst-italic mb-0">No payment transactions recorded.</p>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer bg-light p-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => setViewCustomerModal(null)}
                >
                  Close
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
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 1060 }}
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-transparent border-0 text-center">
              <img
                src={getMediaUrl(previewPhotoUrl)}
                alt="Problem preview"
                className="img-fluid rounded-4 shadow-lg mx-auto"
                style={{ maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain' }}
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
                  onClick={() => setPreviewPhotoUrl(null)}
                >
                  Close
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
