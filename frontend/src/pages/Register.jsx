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
      name: customerForm.name.trim(),
      email: customerForm.email.trim(),
      password: customerForm.password,
      phone: customerForm.phone.trim(),
      city: customerForm.city.trim(),
      pincode: customerForm.pincode.trim(),
      address: customerForm.address.trim(),
    });

    setLoading(false);

    if (result.success) {
      setSuccessMsg('Account created successfully! Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setError(result.message);
    }
  };

  // Handle Technician Form Submission
  const handleTechSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

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
      name: techForm.name.trim(),
      email: techForm.email.trim(),
      password: techForm.password,
      phone: techForm.phone.trim(),
      city: techForm.city.trim(),
      pincode: techForm.pincode.trim(),
      address: techForm.address.trim(),
      service_id: Number(techForm.service_id),
      experience_years: Number(techForm.experience_years),
      qualification: techForm.qualification.trim(),
      hourly_rate: Number(techForm.hourly_rate),
      visiting_charges: Number(techForm.visiting_charges),
      service_area: techForm.service_area.trim(),
      bio: techForm.bio.trim(),
    });

    setLoading(false);

    if (result.success) {
      setSuccessMsg('Technician account registered! Redirecting to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF7F2', minHeight: '80vh' }} className="py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            {/* Header */}
            <div className="text-center mb-4">
              <span
                className="badge px-3 py-1 mb-2"
                style={{
                  backgroundColor: '#F5EFE6',
                  color: '#5A3E2B',
                  border: '1px solid #D8C7B5',
                  fontSize: '0.8rem',
                }}
              >
                Create Account &bull; HOMEFIX
              </span>
              <h2 className="fw-bold mb-1" style={{ color: '#5A3E2B' }}>Create Your HOMEFIX Account</h2>
              <p className="small mb-0" style={{ color: '#4A382C' }}>
                Join as a homeowner to book verified services, or as a skilled technician to provide repairs.
              </p>
            </div>

            <div
              className="p-4 p-md-5"
              style={{
                backgroundColor: '#FFFDF9',
                border: '1px solid #D8C7B5',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(62, 48, 39, 0.05)',
              }}
            >
              {/* Account Type Toggle */}
              <div
                className="d-flex p-1 mb-4"
                style={{
                  backgroundColor: '#F5EFE6',
                  borderRadius: '6px',
                  border: '1px solid #D8C7B5',
                }}
                role="tablist"
              >
                <button
                  type="button"
                  className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
                  style={{
                    backgroundColor: activeTab === 'customer' ? '#5A3E2B' : 'transparent',
                    color: activeTab === 'customer' ? '#FFFDF9' : '#5A3E2B',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                  }}
                  onClick={() => {
                    setActiveTab('customer');
                    setError('');
                  }}
                >
                  <i className="bi bi-person-fill"></i>
                  <span>Customer Registration</span>
                </button>
                <button
                  type="button"
                  className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
                  style={{
                    backgroundColor: activeTab === 'technician' ? '#5A3E2B' : 'transparent',
                    color: activeTab === 'technician' ? '#FFFDF9' : '#5A3E2B',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                  }}
                  onClick={() => {
                    setActiveTab('technician');
                    setError('');
                  }}
                >
                  <i className="bi bi-tools"></i>
                  <span>Technician Registration</span>
                </button>
              </div>

            {/* Error Feedback */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 alert-dismissible fade show small py-2 mb-4" role="alert">
                <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                <div>{error}</div>
                <button type="button" className="btn-close" onClick={() => setError('')}></button>
              </div>
            )}

            {/* Success Feedback */}
            {successMsg && (
              <div className="alert alert-success d-flex align-items-center gap-2 small py-2 mb-4" role="alert">
                <i className="bi bi-check-circle-fill flex-shrink-0"></i>
                <div>{successMsg}</div>
              </div>
            )}

            {/* ======================================================== */}
            {/* CUSTOMER REGISTRATION FORM */}
            {/* ======================================================== */}
            {activeTab === 'customer' && (
              <form onSubmit={handleCustomerSubmit}>
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-circle" style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
                    <span>Personal Information</span>
                  </h6>
                  <p className="text-muted small mb-3">Your details for booking updates and technician communication.</p>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Full Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Arun Kumar"
                        value={customerForm.name}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Email Address <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="name@example.com"
                        value={customerForm.email}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Phone Number (10 Digits) <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text">+91</span>
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
                      <label className="form-label">City <span className="text-danger">*</span></label>
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
                  </div>
                </div>

                <div className="mb-4 pt-3 border-top">
                  <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <span className="badge bg-primary rounded-circle" style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
                    <span>Location & Security</span>
                  </h6>
                  <p className="text-muted small mb-3">Service address and account security password.</p>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Postal Pincode <span className="text-danger">*</span></label>
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
                      <label className="form-label">Residential Address</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        placeholder="House / Flat No., Street, Area"
                        value={customerForm.address}
                        onChange={handleCustomerChange}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Password <span className="text-danger">*</span></label>
                      <input
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder="Min 6 characters"
                        value={customerForm.password}
                        onChange={handleCustomerChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
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
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 mt-2"
                  disabled={loading}
                  style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-check-fill fs-5"></i>
                      <span>Sign Up &bull; Complete Customer Registration</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* TECHNICIAN REGISTRATION FORM */}
            {/* ======================================================== */}
            {activeTab === 'technician' && (
              <form onSubmit={handleTechSubmit}>
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <span className="badge bg-warning text-dark rounded-circle" style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
                    <span>Technician Credentials</span>
                  </h6>
                  <p className="text-muted small mb-3">Your professional identity on HOMEFIX.</p>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Full Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Ramesh Varma"
                        value={techForm.name}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Email Address <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="name@example.com"
                        value={techForm.email}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Phone Number (10 Digits) <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text">+91</span>
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
                      <label className="form-label">City <span className="text-danger">*</span></label>
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
                      <label className="form-label">Password <span className="text-danger">*</span></label>
                      <input
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder="Min 6 characters"
                        value={techForm.password}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
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
                  </div>
                </div>

                <div className="mb-4 pt-3 border-top">
                  <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <span className="badge bg-warning text-dark rounded-circle" style={{ width: '22px', height: '22px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
                    <span>Specialization, Rates & Coverage</span>
                  </h6>
                  <p className="text-muted small mb-3">Define your trade trade specialty, visiting charges, and operating radius.</p>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Primary Trade Specialization <span className="text-danger">*</span></label>
                      <select
                        name="service_id"
                        className="form-select"
                        value={techForm.service_id}
                        onChange={handleTechChange}
                        required
                      >
                        <option value="">-- Choose Trade Category --</option>
                        {services.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.name} (Base Fee: ₹{svc.base_price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Experience (Years) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        name="experience_years"
                        className="form-control"
                        value={techForm.experience_years}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Visiting Fee (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        name="visiting_charges"
                        className="form-control"
                        value={techForm.visiting_charges}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Hourly Rate (₹) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="50"
                        step="10"
                        name="hourly_rate"
                        className="form-control"
                        value={techForm.hourly_rate}
                        onChange={handleTechChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Postal Pincode <span className="text-danger">*</span></label>
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
                      <label className="form-label">Coverage Area / Neighborhood</label>
                      <input
                        type="text"
                        name="service_area"
                        className="form-control"
                        placeholder="e.g. Koramangala / Indiranagar"
                        value={techForm.service_area}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Qualification / ITI Certification</label>
                      <input
                        type="text"
                        name="qualification"
                        className="form-control"
                        placeholder="e.g. Certified ITI Electrician"
                        value={techForm.qualification}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Workshop / Base Address</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        placeholder="Shop / Unit address"
                        value={techForm.address}
                        onChange={handleTechChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Brief Bio / Skills Summary</label>
                      <textarea
                        name="bio"
                        className="form-control"
                        rows="2"
                        placeholder="Mention types of appliances or systems you fix (e.g. Inverter AC, modular switches, copper piping)..."
                        value={techForm.bio}
                        onChange={handleTechChange}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 mt-2"
                  disabled={loading}
                  style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Registering Technician...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-tools fs-5"></i>
                      <span>Sign Up &bull; Complete Technician Registration</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Login Link */}
            <div className="text-center pt-4 border-top mt-4">
              <p className="small mb-0" style={{ color: '#4A382C' }}>
                Already registered with HOMEFIX?{' '}
                <Link to="/login" className="fw-semibold text-decoration-none" style={{ color: '#5A3E2B' }}>
                  Sign in to your account
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
