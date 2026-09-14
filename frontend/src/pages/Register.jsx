import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getServices } from '../services/api.js';

export default function Register() {
  const navigate = useNavigate();
  const { registerCustomer, registerTechnician, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'technician'
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Load available service categories for technician registration
  useEffect(() => {
    const fetchServicesList = async () => {
      const res = await getServices();
      if (res.success && Array.isArray(res.data)) {
        setServices(res.data);
      }
    };
    fetchServicesList();
  }, []);

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: 'Bangalore',
    pincode: '',
    address: '',
  });

  // Technician form state
  const [techForm, setTechForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: 'Bangalore',
    pincode: '',
    address: '',
    service_id: '',
    experience_years: '2',
    qualification: '',
    hourly_rate: '250',
    visiting_charges: '150',
    service_area: '',
    bio: '',
  });

  const handleCustomerChange = (e) => {
    setCustomerForm({ ...customerForm, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleTechChange = (e) => {
    setTechForm({ ...techForm, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  // Handle Customer Form Submission
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Frontend Validations
    if (!customerForm.name.trim()) return setError('Please enter your full name.');
    if (!customerForm.email.trim()) return setError('Please enter your email address.');
    if (customerForm.password.length < 6) return setError('Password must be at least 6 characters long.');
    if (customerForm.password !== customerForm.confirmPassword) {
      return setError('Passwords do not match. Please re-enter.');
    }
    if (customerForm.phone.trim().length < 10) {
      return setError('Please provide a valid 10-digit phone number.');
    }
    if (!customerForm.city.trim()) return setError('Please specify your city.');
    if (!customerForm.pincode.trim()) return setError('Please provide your 6-digit postal pincode.');

    setLoading(true);
    const result = await registerCustomer({
      name: customerForm.name,
      email: customerForm.email,
      password: customerForm.password,
      phone: customerForm.phone,
      city: customerForm.city,
      pincode: customerForm.pincode,
      address: customerForm.address,
    });

    setLoading(false);

    if (result.success) {
      setSuccessMsg('Account created successfully! Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      setError(result.message);
    }
  };

  // Handle Technician Form Submission
  const handleTechSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Frontend Validations
    if (!techForm.name.trim()) return setError('Please enter your full name.');
    if (!techForm.email.trim()) return setError('Please enter your email address.');
    if (techForm.password.length < 6) return setError('Password must be at least 6 characters long.');
    if (techForm.password !== techForm.confirmPassword) {
      return setError('Passwords do not match. Please re-enter.');
    }
    if (techForm.phone.trim().length < 10) {
      return setError('Please provide a valid 10-digit phone number.');
    }
    if (!techForm.service_id) {
      return setError('Please select your primary service specialization.');
    }
    if (!techForm.city.trim()) return setError('Please specify your city.');
    if (!techForm.pincode.trim()) return setError('Please provide your postal pincode.');

    setLoading(true);
    const result = await registerTechnician({
      name: techForm.name,
      email: techForm.email,
      password: techForm.password,
      phone: techForm.phone,
      city: techForm.city,
      pincode: techForm.pincode,
      address: techForm.address,
      service_id: Number(techForm.service_id),
      experience_years: Number(techForm.experience_years),
      qualification: techForm.qualification,
      hourly_rate: Number(techForm.hourly_rate),
      visiting_charges: Number(techForm.visiting_charges),
      service_area: techForm.service_area,
      bio: techForm.bio,
    });

    setLoading(false);

    if (result.success) {
      setSuccessMsg('Technician account registered! Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Header Card */}
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
            <div className="card-body p-4 p-md-5 bg-light border-bottom text-center">
              <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white p-3 rounded-circle mb-3 shadow-sm">
                <i className="bi bi-person-plus-fill fs-2"></i>
              </div>
              <h2 className="fw-bold mb-1">Create an Account</h2>
              <p className="text-muted mb-0">Join HOMEFIX as a Customer or Verified Service Technician</p>
            </div>

            <div className="card-body p-4 p-md-5">
              {/* Role Toggle Tabs */}
              <div className="nav nav-pills nav-fill bg-white p-1 rounded-3 border mb-4 shadow-sm" role="tablist">
                <button
                  type="button"
                  className={`nav-link py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                    activeTab === 'customer' ? 'active shadow-sm' : 'text-secondary'
                  }`}
                  onClick={() => {
                    setActiveTab('customer');
                    setError('');
                  }}
                >
                  <i className="bi bi-person-heart"></i>
                  <span>Customer Registration</span>
                </button>
                <button
                  type="button"
                  className={`nav-link py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                    activeTab === 'technician' ? 'active shadow-sm' : 'text-secondary'
                  }`}
                  onClick={() => {
                    setActiveTab('technician');
                    setError('');
                  }}
                >
                  <i className="bi bi-tools"></i>
                  <span>Technician Registration</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
                  <div>{error}</div>
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              {/* Success Alert */}
              {successMsg && (
                <div className="alert alert-success d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-check-circle-fill flex-shrink-0 fs-5"></i>
                  <div>{successMsg}</div>
                </div>
              )}

              {/* CUSTOMER FORM */}
              {activeTab === 'customer' && (
                <form onSubmit={handleCustomerSubmit}>
                  <h5 className="fw-bold text-dark mb-3 border-start border-4 border-primary ps-2">
                    Customer Account Details
                  </h5>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Rahul Sharma"
                        value={customerForm.name}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="e.g. rahul@example.com"
                        value={customerForm.email}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Phone Number (10 Digits) *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">+91</span>
                        <input
                          type="tel"
                          name="phone"
                          className="form-control"
                          placeholder="9876543210"
                          value={customerForm.phone}
                          onChange={handleCustomerChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">City *</label>
                      <input
                        type="text"
                        name="city"
                        className="form-control"
                        placeholder="Bangalore"
                        value={customerForm.city}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Password *</label>
                      <input
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder="Minimum 6 characters"
                        value={customerForm.password}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Confirm Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        className="form-control"
                        placeholder="Re-type password"
                        value={customerForm.confirmPassword}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        className="form-control"
                        placeholder="e.g. 560034"
                        value={customerForm.pincode}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Residential Address</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        placeholder="Flat / House No., Street, Area"
                        value={customerForm.address}
                        onChange={handleCustomerChange}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Creating Customer Account...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle fs-5"></i>
                          <span>Register as Customer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TECHNICIAN FORM */}
              {activeTab === 'technician' && (
                <form onSubmit={handleTechSubmit}>
                  <h5 className="fw-bold text-dark mb-3 border-start border-4 border-warning ps-2">
                    1. Technician Identity & Credentials
                  </h5>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Amit Verma"
                        value={techForm.name}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="e.g. amit.verma@example.com"
                        value={techForm.email}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Phone Number (10 Digits) *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">+91</span>
                        <input
                          type="tel"
                          name="phone"
                          className="form-control"
                          placeholder="9876543210"
                          value={techForm.phone}
                          onChange={handleTechChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">City *</label>
                      <input
                        type="text"
                        name="city"
                        className="form-control"
                        placeholder="Bangalore"
                        value={techForm.city}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Password *</label>
                      <input
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder="Minimum 6 characters"
                        value={techForm.password}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Confirm Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        className="form-control"
                        placeholder="Re-type password"
                        value={techForm.confirmPassword}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        className="form-control"
                        placeholder="e.g. 560034"
                        value={techForm.pincode}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Service Area / Neighborhood</label>
                      <input
                        type="text"
                        name="service_area"
                        className="form-control"
                        placeholder="e.g. Koramangala / HSR Layout"
                        value={techForm.service_area}
                        onChange={handleTechChange}
                      />
                    </div>
                  </div>

                  <h5 className="fw-bold text-dark mb-3 border-start border-4 border-warning ps-2">
                    2. Service Specialization & Pricing
                  </h5>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Primary Service Category *</label>
                      <select
                        name="service_id"
                        className="form-select"
                        value={techForm.service_id}
                        onChange={handleTechChange}
                        required
                      >
                        <option value="">-- Select Service Specialization --</option>
                        {services.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.name} (Base Price: ₹{svc.base_price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        name="experience_years"
                        className="form-control"
                        value={techForm.experience_years}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Qualification / Certification</label>
                      <input
                        type="text"
                        name="qualification"
                        className="form-control"
                        placeholder="e.g. Certified ITI Electrician"
                        value={techForm.qualification}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold text-secondary">Hourly Rate (₹)</label>
                      <input
                        type="number"
                        min="50"
                        step="10"
                        name="hourly_rate"
                        className="form-control"
                        value={techForm.hourly_rate}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold text-secondary">Visiting Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        name="visiting_charges"
                        className="form-control"
                        value={techForm.visiting_charges}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Bio / Specialization Details</label>
                      <textarea
                        name="bio"
                        className="form-control"
                        rows="2"
                        placeholder="Describe your expertise, certifications, and types of home appliances or fixtures you repair..."
                        value={techForm.bio}
                        onChange={handleTechChange}
                      ></textarea>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="submit"
                      className="btn btn-warning btn-lg w-100 fw-semibold text-dark d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Submitting Technician Registration...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-tools fs-5"></i>
                          <span>Register as Technician</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Card Footer with link to Login */}
              <div className="mt-4 pt-3 border-top text-center">
                <p className="text-secondary mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary fw-semibold text-decoration-none">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
