import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getServices, createBookingApi } from '../services/api.js';

const TIME_SLOTS = [
  'Morning (09:00 AM - 12:00 PM)',
  'Afternoon (12:00 PM - 03:00 PM)',
  'Evening (03:00 PM - 06:00 PM)',
  'Night (06:00 PM - 09:00 PM)',
];

export default function BookService() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('medium');
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Default to tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState(TIME_SLOTS[0]);
  const [serviceAddress, setServiceAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Redirect if not customer or not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'user') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  // Pre-fill user address info
  useEffect(() => {
    if (user) {
      if (user.address) setServiceAddress(user.address);
      if (user.city) setCity(user.city);
      if (user.pincode) setPincode(user.pincode);
    }
  }, [user]);

  // Load available service categories
  useEffect(() => {
    const fetchServicesList = async () => {
      setLoadingServices(true);
      const res = await getServices();
      if (res.success && Array.isArray(res.data)) {
        setServices(res.data);
        if (res.data.length > 0) {
          setSelectedServiceId(res.data[0].id.toString());
        }
      }
      setLoadingServices(false);
    };
    fetchServicesList();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size exceeds 5MB limit.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (error) setError('');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const selectedService = services.find((s) => s.id.toString() === selectedServiceId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedServiceId) {
      return setError('Please select a service category.');
    }
    if (!problemTitle.trim()) {
      return setError('Please enter a brief problem title.');
    }
    if (!problemDescription.trim()) {
      return setError('Please enter details about the problem.');
    }
    if (!serviceAddress.trim()) {
      return setError('Service address is required.');
    }
    if (!city.trim()) {
      return setError('City is required.');
    }
    if (!pincode.trim()) {
      return setError('Pincode is required.');
    }
    if (!scheduledDate) {
      return setError('Please select a scheduled date.');
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('service_id', selectedServiceId);
    formData.append('problem_title', problemTitle.trim());
    formData.append('problem_description', problemDescription.trim());
    formData.append('urgency_level', urgencyLevel);
    formData.append('scheduled_date', scheduledDate);
    formData.append('scheduled_time_slot', scheduledTimeSlot);
    formData.append('service_address', serviceAddress.trim());
    formData.append('city', city.trim());
    formData.append('pincode', pincode.trim());
    if (imageFile) {
      formData.append('problem_image', imageFile);
    }

    const result = await createBookingApi(formData, token);
    setSubmitting(false);

    if (result.ok && result.data.success) {
      setSuccessBooking(result.data.booking);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError(result.data?.message || 'Failed to submit service booking.');
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (successBooking) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow border-0 rounded-4 overflow-hidden text-center p-4 p-md-5">
              <div className="d-inline-flex align-items-center justify-content-center bg-success text-white p-3 rounded-circle mx-auto mb-3 shadow-sm" style={{ width: '75px', height: '75px' }}>
                <i className="bi bi-check-lg fs-1"></i>
              </div>
              <h2 className="fw-bold text-dark mb-2">Complaint Registered!</h2>
              <p className="text-muted mb-4">
                Your home service request has been scheduled successfully.
              </p>

              <div className="bg-light rounded-3 p-3 border mb-4 text-start">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Booking Reference</span>
                  <span className="badge bg-primary fs-6 font-monospace">{successBooking.booking_reference}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Service Category</span>
                  <span className="fw-semibold text-dark">{successBooking.service_name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Scheduled Appointment</span>
                  <span className="fw-semibold text-dark">
                    {new Date(successBooking.scheduled_date).toLocaleDateString()} &bull; {successBooking.scheduled_time_slot}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Urgency Level</span>
                  <span className={`badge ${successBooking.urgency_level === 'emergency' ? 'bg-danger' : successBooking.urgency_level === 'high' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                    {successBooking.urgency_level?.toUpperCase()}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Estimated Base Fee</span>
                  <span className="fw-bold text-success fs-5">₹{successBooking.estimated_cost}</span>
                </div>
              </div>

              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Link to="/my-bookings" className="btn btn-primary btn-lg px-4 fw-semibold shadow-sm">
                  <i className="bi bi-card-checklist me-1"></i> View My Bookings
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-lg px-4"
                  onClick={() => {
                    setSuccessBooking(null);
                    setProblemTitle('');
                    setProblemDescription('');
                    removeImage();
                  }}
                >
                  Book Another Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          {/* Header Banner */}
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4 bg-primary text-white">
            <div className="card-body p-4 p-md-5">
              <span className="badge bg-light text-primary px-3 py-1 rounded-pill fw-semibold mb-2">
                <i className="bi bi-tools me-1"></i> Module 2: Complaint Registration
              </span>
              <h1 className="fw-bold mb-1">Book a Smart Home Service</h1>
              <p className="lead opacity-90 mb-0" style={{ fontSize: '1.05rem' }}>
                Describe your repair requirement, attach a problem photo, and schedule a convenient visit time.
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
            <div className="card-body p-4 p-md-5">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 alert-dismissible fade show mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
                  <div>{error}</div>
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* STEP 1: SERVICE CATEGORY SELECTION */}
                <h5 className="fw-bold text-dark mb-3 border-start border-4 border-primary ps-2">
                  1. Select Home Service Category
                </h5>

                {loadingServices ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted small mt-2">Loading service catalog...</p>
                  </div>
                ) : (
                  <div className="row g-3 mb-4">
                    {services.map((svc) => {
                      const isSelected = selectedServiceId === svc.id.toString();
                      return (
                        <div className="col-12 col-sm-6 col-md-4" key={svc.id}>
                          <div
                            className={`card h-100 p-3 rounded-3 cursor-pointer transition-all border ${
                              isSelected
                                ? 'border-primary bg-primary-subtle shadow-sm'
                                : 'border-secondary-subtle bg-white hover-shadow'
                            }`}
                            onClick={() => setSelectedServiceId(svc.id.toString())}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className={`rounded-circle d-flex align-items-center justify-content-center ${
                                  isSelected ? 'bg-primary text-white' : 'bg-light text-primary'
                                }`}
                                style={{ width: '45px', height: '45px', minWidth: '45px' }}
                              >
                                <i className={`bi ${svc.icon || 'bi-tools'} fs-5`}></i>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="fw-bold mb-1 text-dark">{svc.name}</h6>
                                <span className="badge bg-light text-dark border">
                                  From ₹{svc.base_price}
                                </span>
                              </div>
                              {isSelected && (
                                <i className="bi bi-check-circle-fill text-primary fs-5"></i>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* STEP 2: PROBLEM DETAILS & PHOTO */}
                <h5 className="fw-bold text-dark mb-3 border-start border-4 border-primary ps-2">
                  2. Complaint Details & Problem Photo
                </h5>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-8">
                    <label className="form-label small fw-semibold text-secondary">Problem Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Kitchen sink drain clogged / Fan humming sound"
                      value={problemTitle}
                      onChange={(e) => setProblemTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Urgency Level *</label>
                    <select
                      className="form-select"
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                    >
                      <option value="low">Low (Routine maintenance)</option>
                      <option value="medium">Medium (Standard 24-48 hrs)</option>
                      <option value="high">High (Needs immediate fix)</option>
                      <option value="emergency">Emergency (Safety issue)</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold text-secondary">Detailed Problem Description *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Please describe symptoms, brand/model of appliance if known, and how long the issue has persisted..."
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Problem Photo Upload */}
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-secondary d-flex align-items-center gap-1">
                      <i className="bi bi-camera-fill text-primary"></i>
                      <span>Upload Problem Photo (Optional, max 5MB)</span>
                    </label>

                    {!imagePreview ? (
                      <div className="border border-dashed rounded-3 p-4 text-center bg-light">
                        <i className="bi bi-cloud-arrow-up-fill text-muted fs-1 mb-2"></i>
                        <p className="text-muted small mb-2">Attach a photo of the damaged pipe, socket, or unit to help the technician arrive prepared with correct tools</p>
                        <input
                          type="file"
                          id="problem_photo"
                          className="d-none"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                        />
                        <label htmlFor="problem_photo" className="btn btn-outline-primary btn-sm px-3">
                          <i className="bi bi-image me-1"></i> Choose Photo
                        </label>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 border">
                        <img
                          src={imagePreview}
                          alt="Problem preview"
                          className="rounded-2 object-fit-cover shadow-sm"
                          style={{ width: '80px', height: '80px' }}
                        />
                        <div className="flex-grow-1">
                          <span className="fw-semibold text-dark d-block text-truncate" style={{ maxWidth: '250px' }}>
                            {imageFile?.name}
                          </span>
                          <small className="text-muted">{(imageFile?.size / 1024).toFixed(1)} KB</small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={removeImage}
                          title="Remove photo"
                        >
                          <i className="bi bi-trash me-1"></i> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 3: SCHEDULE & SERVICE LOCATION */}
                <h5 className="fw-bold text-dark mb-3 border-start border-4 border-primary ps-2">
                  3. Appointment Schedule & Service Address
                </h5>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Preferred Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      min={new Date().toISOString().split('T')[0]}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Preferred Time Slot *</label>
                    <select
                      className="form-select"
                      value={scheduledTimeSlot}
                      onChange={(e) => setScheduledTimeSlot(e.target.value)}
                      required
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold text-secondary">Service Address *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="House / Flat No., Apartment Name, Street"
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">City *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Pincode *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 560034"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* ESTIMATED BILLING PREVIEW */}
                <div className="p-3 bg-light rounded-3 border mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <span className="text-muted small d-block">Estimated Base Price:</span>
                    <strong className="fs-5 text-dark">
                      {selectedService ? `${selectedService.name} (Visiting & Diagnosis)` : 'Select a service'}
                    </strong>
                  </div>
                  <div className="text-end">
                    <span className="text-muted small d-block">Estimated Cost</span>
                    <span className="fs-4 fw-bold text-primary">
                      ₹{selectedService ? selectedService.base_price : '0.00'}
                    </span>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm py-3"
                  disabled={submitting || loadingServices}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Registering Complaint...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-calendar-check-fill fs-5"></i>
                      <span>Confirm & Register Service Complaint</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
