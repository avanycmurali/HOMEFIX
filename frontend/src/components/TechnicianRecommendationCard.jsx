import React, { useState } from 'react';

/**
 * Renders a single Recommended Technician card with score breakdown,
 * actual Haversine distance, and recommendation explanation.
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

  const matchScore = rec.matchScore != null ? rec.matchScore : (rec.match_score != null ? rec.match_score : 0);
  const rankPos = rec.rankPosition != null ? rec.rankPosition : (rec.rank_position || rank);
  
  // Rating: Use actual database values
  const rawRating = rec.averageRating != null ? rec.averageRating : rec.technician_rating;
  const rating = rawRating != null ? parseFloat(rawRating) : 0.0;
  const totalReviews = rec.totalReviews != null ? rec.totalReviews : (rec.total_reviews != null ? rec.total_reviews : 0);

  // Experience: Use actual database values
  const expYears = rec.experienceYears != null ? rec.experienceYears : (rec.experience_years != null ? rec.experience_years : 0);

  // Fee: Use actual database values
  const visitingFee = rec.visitingCharges != null ? rec.visitingCharges : (rec.technician_visiting_charges != null ? rec.technician_visiting_charges : (rec.visiting_charges != null ? rec.visiting_charges : 150));
  const hourlyFee = rec.hourlyRate != null ? rec.hourlyRate : (rec.hourly_rate != null ? rec.hourly_rate : 250);

  // Availability
  const availability = rec.availabilityStatus || rec.availability_status || 'available';
  const techName = rec.technicianName || rec.technician_name || 'Recommended Technician';
  const specialization = rec.serviceName || rec.service_name || 'Specialized Service';

  // Standard simple explanation
  const explanation =
    rec.explanation ||
    'Recommended because this technician matches your service, is nearby, available at the requested time, has relevant experience, and has a suitable fee.';

  const getRankBadge = (pos) => {
    switch (pos) {
      case 1:
        return (
          <span className="badge bg-success px-2 py-1 shadow-sm d-flex align-items-center gap-1">
            <i className="bi bi-trophy-fill text-warning"></i>
            <span>#1 Top Recommendation</span>
          </span>
        );
      case 2:
        return (
          <span className="badge bg-primary px-2 py-1 shadow-sm d-flex align-items-center gap-1">
            <i className="bi bi-award-fill"></i>
            <span>#2 Top Recommendation</span>
          </span>
        );
      case 3:
        return (
          <span className="badge bg-secondary px-2 py-1 shadow-sm d-flex align-items-center gap-1">
            <i className="bi bi-award"></i>
            <span>#3 Top Recommendation</span>
          </span>
        );
      default:
        return (
          <span className="badge bg-light text-dark border px-2 py-1">
            Rank #{pos}
          </span>
        );
    }
  };

  return (
    <div
      className={`card border rounded-4 overflow-hidden shadow-sm mb-3 ${
        rankPos === 1 ? 'border-success' : 'border-light-subtle'
      }`}
    >
      {/* Card Header */}
      <div
        className={`card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2 ${
          rankPos === 1
            ? 'bg-success-subtle text-success-emphasis border-success-subtle'
            : 'bg-light'
        }`}
      >
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {getRankBadge(rankPos)}
          <span className="badge bg-white text-dark border shadow-xs fw-bold">
            <i className="bi bi-stars text-warning me-1"></i>
            {matchScore}% Match
          </span>
        </div>

        {/* Availability Badge */}
        <span
          className={`badge rounded-pill text-capitalize ${
            availability === 'available'
              ? 'bg-success'
              : availability === 'busy'
              ? 'bg-warning text-dark'
              : 'bg-secondary'
          }`}
        >
          <i className="bi bi-dot"></i>
          {availability === 'available'
            ? 'Available at Requested Time'
            : availability === 'busy'
            ? 'Busy'
            : 'Offline'}
        </span>
      </div>

      {/* Card Body */}
      <div className="card-body p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
          <div>
            <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-person-badge text-primary"></i>
              <span>{techName}</span>
            </h5>
            <span className="text-muted small d-block">
              Specialization: <strong className="text-secondary">{specialization}</strong>
            </span>
            {rec.qualification && (
              <span className="text-secondary small d-block">
                <i className="bi bi-patch-check-fill text-success me-1"></i>
                {rec.qualification}
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="text-end">
            <div className="badge bg-warning text-dark fs-6 px-2 py-1 shadow-sm">
              <i className="bi bi-star-fill me-1"></i>
              {rating > 0 ? `${rating.toFixed(1)} / 5.0` : 'New'}
            </div>
            {totalReviews > 0 ? (
              <span className="d-block text-muted small mt-1">
                {totalReviews} verified reviews
              </span>
            ) : (
              <span className="d-block text-muted small mt-1">
                Verified Technician
              </span>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="p-3 bg-light rounded-3 border mb-3">
          <div className="row g-2 small text-dark">
            {/* Experience */}
            <div className="col-6 col-md-3">
              <span className="text-muted d-block">Experience:</span>
              <strong className="fs-6">{expYears} Years</strong>
            </div>

            {/* Visiting / Hourly Fee */}
            <div className="col-6 col-md-3">
              <span className="text-muted d-block">Visiting / Hourly Fee:</span>
              <strong className="fs-6 text-primary">₹{visitingFee}</strong>
              <small className="text-muted d-block">Hourly: ₹{hourlyFee}/hr</small>
            </div>

            {/* Work Distance */}
            <div className="col-6 col-md-3">
              <span className="text-muted d-block">Work Distance:</span>
              {distanceKm !== null && distanceKm !== undefined ? (
                <strong className="fs-6 text-success d-flex align-items-center gap-1">
                  <i className="bi bi-geo-alt-fill text-danger"></i>
                  <span>{distanceKm} km</span>
                </strong>
              ) : (
                <span className="text-muted">
                  <i className="bi bi-geo-alt me-1"></i>
                  {rec.city ? `${rec.city} (Coords unavailable)` : 'Not available'}
                </span>
              )}
            </div>

            {/* Availability */}
            <div className="col-6 col-md-3">
              <span className="text-muted d-block">Availability:</span>
              <strong className="text-capitalize text-dark d-flex align-items-center gap-1">
                <i
                  className={`bi ${
                    availability === 'available'
                      ? 'bi-calendar-check text-success'
                      : 'bi-calendar-x text-warning'
                  }`}
                ></i>
                <span>{availability}</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Simple Explanation Box (Requirement 4) */}
        <div className="p-3 rounded-3 border bg-info-subtle text-info-emphasis mb-3 d-flex align-items-start gap-2">
          <i className="bi bi-info-circle-fill fs-5 text-primary mt-1"></i>
          <div>
            <strong className="d-block small text-dark fw-bold mb-1">
              Why This Technician is Recommended:
            </strong>
            <p className="mb-0 small">{explanation}</p>
          </div>
        </div>

        {/* Factor Breakdown Accordion (Requirement 2 & 5) */}
        <div>
          <button
            type="button"
            className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center gap-1"
            onClick={() => setShowBreakdown((prev) => !prev)}
          >
            <i className={`bi ${showBreakdown ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            <span className="fw-semibold">
              {showBreakdown ? 'Hide Factor Breakdown' : 'View Detailed Factor Breakdown'}
            </span>
          </button>

          {showBreakdown && (
            <div className="mt-3 p-3 bg-white border rounded-3 small shadow-xs">
              <h6 className="fw-bold mb-2 text-dark small">
                Recommendation Criteria Breakdown (Calculated by Engine):
              </h6>
              <div className="row g-2">
                {/* Location / Distance */}
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-muted d-block">Location & Distance:</span>
                    <strong className="text-dark">
                      {breakdown.location_score != null ? breakdown.location_score : 30} / 30 pts
                    </strong>
                    {distanceKm !== null && distanceKm !== undefined ? (
                      <small className="d-block text-success font-monospace">
                        ({distanceKm} km via Haversine calculation)
                      </small>
                    ) : (
                      <small className="d-block text-muted">
                        (Coordinates not provided &bull; matched by city/area)
                      </small>
                    )}
                  </div>
                </div>

                {/* Availability */}
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-muted d-block">Schedule Availability:</span>
                    <strong className="text-dark">
                      {breakdown.availability_score != null ? breakdown.availability_score : 20} / 20 pts
                    </strong>
                    <small className="d-block text-muted">
                      {availability === 'available'
                        ? 'No schedule conflict detected'
                        : 'Partial conflict or busy'}
                    </small>
                  </div>
                </div>

                {/* Rating */}
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-muted d-block">Customer Rating:</span>
                    <strong className="text-dark">
                      {breakdown.rating_score != null ? breakdown.rating_score : 18} / 20 pts
                    </strong>
                    <small className="d-block text-muted">
                      {rating > 0
                        ? `${rating.toFixed(1)} / 5.0 rating score`
                        : 'Baseline for verified technician'}
                    </small>
                  </div>
                </div>

                {/* Experience */}
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-muted d-block">Relevant Experience:</span>
                    <strong className="text-dark">
                      {breakdown.experience_score != null ? breakdown.experience_score : 12} / 15 pts
                    </strong>
                    <small className="d-block text-muted">
                      {expYears} years in field
                    </small>
                  </div>
                </div>

                {/* Visiting Fee */}
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-muted d-block">Visiting Fee Rate:</span>
                    <strong className="text-dark">
                      {breakdown.fee_score != null ? breakdown.fee_score : 15} / 15 pts
                    </strong>
                    <small className="d-block text-muted">
                      ₹{visitingFee} visiting charge
                    </small>
                  </div>
                </div>

                {/* Total Score */}
                <div className="col-12 col-sm-6 col-md-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-muted d-block">Total Match Score:</span>
                    <strong className="text-success fs-6">
                      {matchScore}% / 100%
                    </strong>
                    <small className="d-block text-muted">
                      Overall Match Percentage
                    </small>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selection Action Footer */}
        {(selectable || onSelectTechnician || isSelected || rec.wasSelected || rec.isRejected) && (
          <div className="d-flex justify-content-between align-items-center pt-3 mt-3 border-top flex-wrap gap-2">
            <div>
              {rec.isRejected ? (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle py-2 px-3">
                  <i className="bi bi-slash-circle me-1"></i> Declined Previously
                </span>
              ) : isSelected || rec.wasSelected ? (
                <span className="badge bg-success py-2 px-3 fs-6 shadow-sm">
                  <i className="bi bi-check2-circle me-1"></i> Selected Technician
                </span>
              ) : (
                <span className="text-muted small">
                  Choose this verified technician for your service request
                </span>
              )}
            </div>

            {onSelectTechnician && !rec.isRejected && !isSelected && !rec.wasSelected && (
              <button
                type="button"
                className="btn btn-primary fw-semibold px-4 shadow-sm d-flex align-items-center gap-2"
                disabled={isSelecting}
                onClick={() => onSelectTechnician(rec)}
              >
                <i className="bi bi-person-check-fill"></i>
                <span>Select Technician</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders the list of Top 3 Recommended Technicians in ranked order.
 * If multiple technicians are available, displays up to top 3 with their
 * scores and factor breakdowns.
 */
export function TechnicianRecommendationsList({
  recommendations = [],
  title = 'Recommended Technicians for Your Service',
  onSelectTechnician,
  selectedTechnicianId = null,
  selectable = false,
  isSelecting = false,
}) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-4 rounded-4 border bg-light text-center my-3">
        <i className="bi bi-person-search fs-2 text-muted mb-2 d-block"></i>
        <h6 className="fw-bold text-dark mb-1">No Technician Matches Available</h6>
        <p className="text-muted small mb-0">
          Our recommendation engine is currently searching for available verified technicians in your service area.
        </p>
      </div>
    );
  }

  const top3 = recommendations.slice(0, 3);

  return (
    <div className="my-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-stars text-warning"></i>
            <span>{title}</span>
          </h5>
          <span className="text-muted small">
            {top3.length === 1
              ? 'Showing the best matching technician for your service request.'
              : `Showing top ${top3.length} recommendations in ranked order based on 6 evaluation factors.`}
          </span>
        </div>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill">
          <i className="bi bi-cpu-fill me-1"></i> Multi-Criteria Recommendation
        </span>
      </div>

      <div className="d-flex flex-column gap-2">
        {top3.map((rec, index) => (
          <TechnicianRecommendationCard
            key={rec.technicianId || rec.id || index}
            rec={rec}
            rank={rec.rankPosition || index + 1}
            defaultExpanded={index === 0} // Expand top 1 factor breakdown by default
            onSelectTechnician={onSelectTechnician}
            isSelected={selectedTechnicianId === rec.technicianId}
            selectable={selectable}
            isSelecting={isSelecting}
          />
        ))}
      </div>
    </div>
  );
}

export default TechnicianRecommendationCard;
