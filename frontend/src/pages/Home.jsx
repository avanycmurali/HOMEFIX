import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  // Logged-in customers use Dashboard as their Home page
  if (isAuthenticated && user?.role === 'user') {
    return <Navigate to="/dashboard" replace />;
  }

  const services = [
    {
      id: 'plumbing',
      name: 'Plumbing',
      icon: 'bi-wrench-adjustable',
      desc: 'Pipe leakages, tap repairs, bathroom fittings, and drain cleaning.',
    },
    {
      id: 'electrical',
      name: 'Electrical',
      icon: 'bi-lightning-charge',
      desc: 'Wiring issues, switchboard repairs, fans, lighting, and circuit breakers.',
    },
    {
      id: 'carpentry',
      name: 'Carpentry',
      icon: 'bi-hammer',
      desc: 'Furniture repair, door locks, wooden fixtures, and cabinetry.',
    },
    {
      id: 'painting',
      name: 'Painting',
      icon: 'bi-paint-bucket',
      desc: 'Interior wall painting, exterior coats, touch-ups, and waterproofing.',
    },
    {
      id: 'appliance',
      name: 'Appliance Repair',
      icon: 'bi-gear-wide-connected',
      desc: 'Refrigerators, washing machines, microwaves, and household appliances.',
    },
    {
      id: 'ac',
      name: 'AC Servicing',
      icon: 'bi-snow',
      desc: 'AC cooling issues, filter cleaning, gas refill, and routine servicing.',
    },
    {
      id: 'cleaning',
      name: 'Cleaning',
      icon: 'bi-stars',
      desc: 'Deep home cleaning, kitchen scrubbing, and bathroom sanitization.',
    },
  ];

  return (
    <div style={{ backgroundColor: '#FAF7F2' }} className="py-4">
      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="py-5 text-center">
        <div className="container py-2">
          <div className="row justify-content-center">
            <div className="col-12 col-md-9 col-lg-7">
              <h1 className="fw-bold mb-3 lh-sm" style={{ color: '#5A3E2B', fontSize: '2.4rem' }}>
                Reliable Home Services, Made Simple
              </h1>

              <p className="mb-4 mx-auto" style={{ color: '#4A382C', fontSize: '1.05rem', maxWidth: '520px' }}>
                Book trusted technicians for your home service needs. Quick scheduling, upfront pricing, and verified local professionals.
              </p>

              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Link
                  to="/book-service"
                  className="btn btn-primary px-4 py-2 fw-semibold"
                  style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  Book a Service
                </Link>
                <a
                  href="#services"
                  className="btn px-4 py-2 fw-medium"
                  style={{ backgroundColor: '#F5EFE6', borderColor: '#D8C7B5', color: '#2B1E16' }}
                >
                  Explore Services
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SERVICES SECTION
          ========================================================================= */}
      <section id="services" className="py-4">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="fw-bold mb-1" style={{ color: '#5A3E2B', fontSize: '1.75rem' }}>
              Our Home Services
            </h2>
            <p className="small mb-0" style={{ color: '#4A382C' }}>
              Select a service category to request an appointment with a nearby specialist.
            </p>
          </div>

          <div className="row g-3 justify-content-center">
            {services.map((srv) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-4" key={srv.id}>
                <div
                  className="p-3 h-100 d-flex flex-column justify-content-between"
                  style={{
                    backgroundColor: '#FFFDF9',
                    border: '1px solid #D8C7B5',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(62, 48, 39, 0.04)',
                  }}
                >
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded"
                        style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: '#F5EFE6',
                          color: '#5A3E2B',
                          border: '1px solid #D8C7B5',
                          fontSize: '1.1rem',
                        }}
                      >
                        <i className={`bi ${srv.icon}`}></i>
                      </div>
                      <h5 className="fw-bold mb-0" style={{ color: '#5A3E2B', fontSize: '1.1rem' }}>
                        {srv.name}
                      </h5>
                    </div>
                    <p className="small mb-3" style={{ color: '#4A382C', lineHeight: '1.45' }}>
                      {srv.desc}
                    </p>
                  </div>

                  <div>
                    <Link
                      to={`/book-service?category=${srv.id}`}
                      className="btn btn-sm w-100 fw-semibold"
                      style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                    >
                      Book {srv.name}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ABOUT / PROJECT SUMMARY SECTION
          ========================================================================= */}
      <section id="about" className="py-4 mt-3">
        <div className="container">
          <div
            className="p-4 p-md-5 text-center mx-auto"
            style={{
              backgroundColor: '#F5EFE6',
              border: '1px solid #D8C7B5',
              borderRadius: '8px',
              maxWidth: '820px',
            }}
          >
            <h3 className="fw-bold mb-2" style={{ color: '#5A3E2B' }}>
              About HOMEFIX Services
            </h3>
            <p className="small mb-3" style={{ color: '#4A382C', maxWidth: '620px', margin: '0 auto' }}>
              HOMEFIX is a reliable home service platform connecting homeowners with trusted, verified local technicians. Through intelligent recommendation matching based on trade specialization, proximity, ratings, and upfront pricing, we make home repairs and maintenance simple, seamless, and transparent.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <Link
                to="/book-service"
                className="btn btn-sm px-4 fw-semibold"
                style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
              >
                Schedule a Service
              </Link>
              <Link
                to="/register"
                className="btn btn-sm px-4 fw-semibold"
                style={{ backgroundColor: '#7A5C45', borderColor: '#7A5C45', color: '#FFFDF9' }}
              >
                Sign Up as Technician
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
