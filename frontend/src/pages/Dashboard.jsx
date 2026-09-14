import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, technicianProfile, logout } = useAuth();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge bg-danger fs-6 px-3 py-2 rounded-pill"><i className="bi bi-shield-lock-fill me-1"></i> Administrator</span>;
      case 'technician':
        return <span className="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill"><i className="bi bi-person-gear me-1"></i> Service Technician</span>;
      default:
        return <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill"><i className="bi bi-person-check-fill me-1"></i> Customer</span>;
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
              Authenticated via secure JWT token • Logged in as <strong className="text-white text-capitalize">{user.role}</strong>
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
        {/* Left Column: Account Profile Details */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 rounded-4 h-100">
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
        </div>

        {/* Right Column: Role-Specific Workspace */}
        <div className="col-12 col-lg-7">
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
            <div className="card shadow-sm border-0 rounded-4 h-100">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-tools text-warning"></i>
                  <span>Technician Profile & Workspace</span>
                </h5>
                <span className={`badge ${technicianProfile?.verification_status === 'verified' ? 'bg-success' : 'bg-warning text-dark'}`}>
                  {technicianProfile?.verification_status === 'verified' ? 'Verified Technician' : 'Verification: Pending'}
                </span>
              </div>
              <div className="card-body p-4">
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
                        <strong className="fs-6 text-dark">₹{technicianProfile.hourly_rate} / ₹{technicianProfile.visiting_charges}</strong>
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
    </div>
  );
}
