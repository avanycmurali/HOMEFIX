import React, { useState } from 'react';

/**
 * Modern Production-Grade Technician Recommendation Card for HOMEFIX
 * Adheres strictly to the multi-criteria intelligent ranking specifications.
 */
export function TechnicianRecommendationCard({
  rec,
  rank = 1,
  defaultExpanded = false,
  onSelectTechnician,
  isSelected = false,
  selectable = false,
  isSelecting = false,
}) {
  const [showBreakdown, setShowBreakdown] = useState(defaultExpanded);

  if (!rec) return null;

  const breakdown = rec.breakdown || rec.score_breakdown || {};
  const distanceKm =
    rec.distanceKm !== undefined && rec.distanceKm !== null
      ? rec.distanceKm
      : breakdown.distance_km !== undefined && breakdown.distance_km !== null
      ? breakdown.distance_km
      : null;

  const matchScore = rec.matchScore != null ? rec.matchScore : (rec.match_score != null ? rec.match_score : 85);
  const rankPos = rec.rankPosition != null ? rec.rankPosition : (rec.rank_position || rank);
  
  // Rating
  const rawRating = rec.averageRating != null ? rec.averageRating : rec.technician_rating;
  const rating = rawRating != null ? parseFloat(rawRating) : 5.0;
  const totalReviews = rec.totalReviews != null ? rec.totalReviews : (rec.total_reviews != null ? rec.total_reviews : 0);

  // Experience
  const expYears = rec.experienceYears != null ? rec.experienceYears : (rec.experience_years != null ? rec.experience_years : 2);

  // Fees
  const visitingFee = rec.visitingCharges != null ? rec.visitingCharges : (rec.technician_visiting_charges != null ? rec.technician_visiting_charges : (rec.visiting_charges != null ? rec.visiting_charges : 150));
  const hourlyFee = rec.hourlyRate != null ? rec.hourlyRate : (rec.hourly_rate != null ? rec.hourly_rate : 250);

  // Availability & Trade
  const availability = rec.availabilityStatus || rec.availability_status || 'available';
  const techName = rec.technicianName || rec.technician_name || 'Recommended Technician';
  const specialization = rec.serviceName || rec.service_name || 'Home Specialist';

  const isTopMatch = rankPos === 1;

  return (
    <div
      className={`hf-rec-card ${isTopMatch ? 'top-pick' : ''} ${isSelected ? 'selected' : ''} mb-3`}
      style={{
        backgroundColor: isSelected ? '#FAF5EE' : '#FFFDF9',
        borderColor: isSelected || isTopMatch ? '#5A3E2B' : '#D8C7B5',
        borderRadius: '8px',
        borderWidth: isTopMatch || isSelected ? '1.5px' : '1px',
      }}
    >
      {/* Top Header Badge Row */}
      <div
        className="d-flex justify-content-between align-items-center p-3 px-4 border-bottom"
        style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
      >
        <div className="d-flex align-items-center gap-2">
          {isTopMatch ? (
            <span
              className="badge px-2.5 py-1.5 fw-semibold"
              style={{ backgroundColor: '#5A3E2B', color: '#FFFDF9', borderRadius: '4px' }}
            >
              #1 Best Match
            </span>
          ) : rankPos === 2 ? (
            <span
              className="badge px-2.5 py-1.5 fw-semibold"
              style={{ backgroundColor: '#7A5C45', color: '#FFFDF9', borderRadius: '4px' }}
            >
              #2 Match
            </span>
          ) : (
            <span
              className="badge px-2.5 py-1.5 fw-semibold"
              style={{ backgroundColor: '#E8D8C7', color: '#5A3E2B', borderRadius: '4px' }}
            >
              #{rankPos} Option
            </span>
          )}

          <span
            className="badge px-2.5 py-1.5 fw-medium"
            style={{ backgroundColor: '#FFFDF9', color: '#3E3027', border: '1px solid #D8C7B5', borderRadius: '4px' }}
          >
            Match Score: {matchScore}%
          </span>
        </div>

        <span
          className="badge px-2.5 py-1 text-capitalize fw-medium"
          style={{
            backgroundColor: availability === 'available' ? 'rgba(95, 118, 84, 0.12)' : 'rgba(169, 121, 63, 0.12)',
            color: availability === 'available' ? '#5F7654' : '#A9793F',
            border: `1px solid ${availability === 'available' ? '#5F7654' : '#A9793F'}`,
            borderRadius: '4px',
          }}
        >
          {availability === 'available' ? '● Available' : '● Busy'}
        </span>
      </div>

      <div className="p-4">
        {/* Profile Header */}
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center fw-bold fs-5 flex-shrink-0 border"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '6px',
                backgroundColor: '#F5EFE6',
                color: '#5A3E2B',
                borderColor: '#D8C7B5',
              }}
            >
              {techName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 className="fw-bold mb-0.5 d-flex align-items-center gap-1.5" style={{ color: '#3E3027' }}>
                <span>{techName}</span>
                {rec.is_verified !== false && (
                  <i className="bi bi-patch-check-fill" style={{ color: '#5F7654' }} title="Verified Technician"></i>
                )}
              </h5>
              <div className="small fw-medium" style={{ color: '#4A382C' }}>{specialization}</div>
            </div>
          </div>

          <div className="text-end">
            <div
              className="d-inline-flex align-items-center gap-1 px-2.5 py-1 fw-bold small border"
              style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '4px', color: '#3E3027' }}
            >
              <i className="bi bi-star-fill" style={{ color: '#A9793F' }}></i>
              <span>{rating > 0 ? rating.toFixed(1) : '5.0'}</span>
            </div>
            {totalReviews > 0 && (
              <small className="d-block" style={{ fontSize: '0.75rem', color: '#4A382C' }}>
                ({totalReviews} reviews)
              </small>
            )}
          </div>
        </div>

        {/* Key Attributes Grid */}
        <div className="p-3 border mb-3" style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}>
          <div className="row g-2 small">
            <div className="col-6 col-sm-4">
              <span className="d-block" style={{ color: '#4A382C' }}>Experience:</span>
              <strong className="fs-6" style={{ color: '#3E3027' }}>{expYears} Years</strong>
            </div>

            <div className="col-6 col-sm-4">
              <span className="d-block" style={{ color: '#4A382C' }}>Distance:</span>
              {distanceKm !== null && distanceKm !== undefined ? (
                <strong className="fs-6 d-flex align-items-center gap-1" style={{ color: '#5F7654' }}>
                  <i className="bi bi-geo-alt-fill text-danger"></i>
                  <span>{distanceKm} km</span>
                </strong>
              ) : (
                <span style={{ color: '#3E3027' }}>{rec.city || 'Nearby'}</span>
              )}
            </div>

            <div className="col-12 col-sm-4">
              <span className="d-block" style={{ color: '#4A382C' }}>Visiting Fee:</span>
              <strong className="fs-6" style={{ color: '#5A3E2B' }}>₹{visitingFee}</strong>
              <span className="ms-1" style={{ fontSize: '0.75rem', color: '#4A382C' }}>(₹{hourlyFee}/hr)</span>
            </div>
          </div>
        </div>

        {/* Match Score Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center small mb-1">
            <span className="fw-semibold" style={{ color: '#4A382C' }}>Match Score</span>
            <span className="fw-bold" style={{ color: '#5A3E2B' }}>{matchScore}%</span>
          </div>
          <div style={{ height: '7px', backgroundColor: '#E8D8C7', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(10, matchScore))}%`,
                height: '100%',
                backgroundColor: '#5A3E2B',
                borderRadius: '4px',
              }}
            ></div>
          </div>
        </div>

        {/* Why Recommended Checklist */}
        <div className="p-3 border mb-3" style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}>
          <span className="small fw-bold d-block mb-1.5" style={{ color: '#3E3027' }}>
            <i className="bi bi-check-circle-fill me-1" style={{ color: '#5F7654' }}></i> Why recommended
          </span>
          <div className="row g-1 small" style={{ color: '#4A382C' }}>
            <div className="col-6 d-flex align-items-center gap-1.5">
              <i className="bi bi-check2 fw-bold" style={{ color: '#5F7654' }}></i>
              <span>Service match</span>
            </div>
            <div className="col-6 d-flex align-items-center gap-1.5">
              <i className="bi bi-check2 fw-bold" style={{ color: '#5F7654' }}></i>
              <span>Nearby ({distanceKm ? `${distanceKm} km` : 'Local'})</span>
            </div>
            <div className="col-6 d-flex align-items-center gap-1.5">
              <i className="bi bi-check2 fw-bold" style={{ color: '#5F7654' }}></i>
              <span>Available slot</span>
            </div>
            <div className="col-6 d-flex align-items-center gap-1.5">
              <i className="bi bi-check2 fw-bold" style={{ color: '#5F7654' }}></i>
              <span>Rating ({rating.toFixed(1)} ★)</span>
            </div>
          </div>
        </div>

        {/* Factor Breakdown Accordion Toggle */}
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none p-0 d-flex align-items-center gap-1 fw-semibold"
            style={{ color: '#7A5C45' }}
            onClick={() => setShowBreakdown((prev) => !prev)}
          >
            <i className={`bi ${showBreakdown ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            <span>{showBreakdown ? 'Hide Detailed Scoring Factors' : 'View Detailed Scoring Factors'}</span>
          </button>

          {showBreakdown && (
            <div className="mt-2 p-3 border rounded-2 small" style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5' }}>
              <div className="row g-2">
                <div className="col-6 col-md-4">
                  <span className="d-block" style={{ color: '#4A382C' }}>Location & Distance:</span>
                  <strong style={{ color: '#3E3027' }}>{breakdown.location_score ?? 30} / 30 pts</strong>
                </div>
                <div className="col-6 col-md-4">
                  <span className="d-block" style={{ color: '#4A382C' }}>Availability:</span>
                  <strong style={{ color: '#3E3027' }}>{breakdown.availability_score ?? 20} / 20 pts</strong>
                </div>
                <div className="col-6 col-md-4">
                  <span className="d-block" style={{ color: '#4A382C' }}>Customer Rating:</span>
                  <strong style={{ color: '#3E3027' }}>{breakdown.rating_score ?? 18} / 20 pts</strong>
                </div>
                <div className="col-6 col-md-4">
                  <span className="d-block" style={{ color: '#4A382C' }}>Experience:</span>
                  <strong style={{ color: '#3E3027' }}>{breakdown.experience_score ?? 12} / 15 pts</strong>
                </div>
                <div className="col-6 col-md-4">
                  <span className="d-block" style={{ color: '#4A382C' }}>Visiting Fee Rate:</span>
                  <strong style={{ color: '#3E3027' }}>{breakdown.fee_score ?? 15} / 15 pts</strong>
                </div>
                <div className="col-6 col-md-4">
                  <span className="d-block" style={{ color: '#4A382C' }}>Total Match Score:</span>
                  <strong style={{ color: '#5A3E2B' }}>{matchScore}% / 100%</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selection Button */}
        {(selectable || onSelectTechnician || isSelected || rec.wasSelected || rec.isRejected) && (
          <div className="pt-2 border-top" style={{ borderColor: '#D8C7B5' }}>
            {rec.isRejected ? (
              <div className="alert alert-danger py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-slash-circle-fill"></i>
                <span>Technician previously declined this booking.</span>
              </div>
            ) : isSelected || rec.wasSelected ? (
              <div
                className="btn w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 py-2"
                style={{ backgroundColor: '#5F7654', color: '#FFFDF9', borderRadius: '6px' }}
              >
                <i className="bi bi-check2-circle fs-5"></i>
                <span>Selected Technician</span>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                disabled={isSelecting}
                style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                onClick={() => onSelectTechnician && onSelectTechnician(rec)}
              >
                {isSelecting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Selecting...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-check-fill fs-5"></i>
                    <span>Select Technician</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top 3 Recommendations List Container
 */
export function TechnicianRecommendationsList({
  recommendations = [],
  title = 'Recommended for you',
  subtitle = 'Based on your service requirements and technician preferences.',
  onSelectTechnician,
  selectedTechnicianId = null,
  selectable = true,
  isSelecting = false,
}) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div
        className="p-4 border text-center my-3 shadow-sm"
        style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
      >
        <i className="bi bi-person-search fs-1 mb-2 d-block" style={{ color: '#4A382C' }}></i>
        <h6 className="fw-bold mb-1" style={{ color: '#3E3027' }}>Searching for Best Technician Matches</h6>
        <p className="small mx-auto mb-0" style={{ maxWidth: '420px', color: '#4A382C' }}>
          Finding available technicians near your location. Please check back shortly or track your booking.
        </p>
      </div>
    );
  }

  const top3 = recommendations.slice(0, 3);

  return (
    <div className="my-4">
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span
            className="badge px-2.5 py-1 small fw-semibold"
            style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
          >
            <i className="bi bi-check2-circle me-1" style={{ color: '#5F7654' }}></i> Recommended Matches
          </span>
        </div>
        <h4 className="fw-bold mb-1" style={{ color: '#3E3027' }}>{title}</h4>
        <p className="small mb-0" style={{ color: '#4A382C' }}>{subtitle}</p>
      </div>

      <div className="row g-3">
        {top3.map((rec, index) => (
          <div className="col-12 col-lg-4" key={rec.technicianId || rec.id || index}>
            <TechnicianRecommendationCard
              rec={rec}
              rank={rec.rankPosition || index + 1}
              defaultExpanded={false}
              onSelectTechnician={onSelectTechnician}
              isSelected={selectedTechnicianId === (rec.technicianId || rec.technician_id || rec.id)}
              selectable={selectable}
              isSelecting={isSelecting}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default TechnicianRecommendationCard;
