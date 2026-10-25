import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getServices, createBookingApi, selectTechnicianApi } from '../services/api.js';
import { TechnicianRecommendationsList } from '../components/TechnicianRecommendationCard.jsx';
import { detectComplaintDetails } from '../utils/complaintDetection.js';

const TIME_SLOTS = [
  'Morning (09:00 AM - 12:00 PM)',
  'Afternoon (12:00 PM - 03:00 PM)',
  'Evening (03:00 PM - 06:00 PM)',
  'Night (06:00 PM - 09:00 PM)',
];

const SERVICE_ICONS = {
  'Plumbing Services': 'bi-wrench-adjustable',
  'Electrical Services': 'bi-lightning-charge-fill',
  'Carpentry Services': 'bi-hammer',
  'Home Painting': 'bi-paint-bucket',
  'AC & Appliance Repair': 'bi-snow',
  'Deep Home Cleaning': 'bi-stars',
};

const SERVICE_DESCRIPTIONS = {
  'Plumbing Services': 'Pipes, leaky taps, bathroom & kitchen fittings, drainage & water tanks',
  'Electrical Services': 'Wiring, switches, fuse, fans, lights, circuit breakers & power fixes',
  'Carpentry Services': 'Doors, locks, cabinets, furniture assembly & wooden repairs',
  'Home Painting': 'Interior & exterior painting, wall touch-ups, waterproof coating',
  'AC & Appliance Repair': 'AC gas refill, refrigerator, washing machine & microwave repair',
  'Deep Home Cleaning': 'Deep sanitization, floor scrubbing, kitchen & bathroom restoration',
};

export default function BookService() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // Active step indicator: 1 = Service, 2 = Complaint, 3 = Schedule & Location, 4 = Review
  const [activeStep, setActiveStep] = useState(1);

  // Complaint input active mode: 'text' | 'image' | 'voice' | 'all'
  const [complaintTab, setComplaintTab] = useState('text');

  // Technician selection modal state
  const [confirmingTechnician, setConfirmingTechnician] = useState(null);
  const [selectingLoading, setSelectingLoading] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);

  // Location / Geolocation State
  const [geoCoords, setGeoCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('medium');
  const [scheduledDate, setScheduledDate] = useState(() => {
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

  // Voice Complaint & Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [speechLanguage, setSpeechLanguage] = useState('en-IN'); // 'en-IN' or 'ml-IN'
  const [voiceTranscription, setVoiceTranscription] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState('');
  const [detectedInfo, setDetectedInfo] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const mediaStreamRef = useRef(null);

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

  // Check browser Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      setSpeechError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setSpeechError('Microphone recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = speechLanguage;
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript;
            }
            if (fullTranscript.trim()) {
              setVoiceTranscription(fullTranscript);
              const detected = detectComplaintDetails(fullTranscript);
              if (detected.match_found) {
                setDetectedInfo(detected);
              }
            }
          };

          recognition.onerror = (event) => {
            if (event.error === 'not-allowed') {
              setSpeechError('Microphone permission denied for speech recognition.');
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (recErr) {
          console.warn('SpeechRecognition start failed:', recErr);
        }
      }
    } catch (err) {
      setSpeechError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings.'
          : `Could not access microphone: ${err.message}`
      );
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const removeVoiceRecording = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setVoiceTranscription('');
    setDetectedInfo(null);
    setRecordingSeconds(0);
  };

  const handleApplyDetectedComplaint = () => {
    if (!detectedInfo) return;
    if (detectedInfo.service_id) {
      setSelectedServiceId(detectedInfo.service_id.toString());
    }
    if (detectedInfo.detected_problem) {
      setProblemTitle(detectedInfo.detected_problem);
    }
    if (voiceTranscription) {
      setProblemDescription(voiceTranscription);
    }
  };

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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lon = parseFloat(pos.coords.longitude.toFixed(6));
        setGeoCoords({ lat, lon });
        setLocationMessage(`GPS coordinates attached (${lat}, ${lon})`);
      },
      (err) => {
        setLocating(false);
        setLocationMessage(`GPS unavailable (${err.message}). City coordinates will be used.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const selectedService = services.find((s) => s.id.toString() === selectedServiceId);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const hasText = problemTitle.trim() && problemDescription.trim();
    const hasVoice = !!audioBlob || !!voiceTranscription.trim();
    const hasPhoto = !!imageFile;

    if (!hasText && !hasVoice && !hasPhoto) {
      return setError('Please provide complaint details via Text, Voice Complaint, or Problem Photo.');
    }

    let effectiveTitle = problemTitle.trim();
    let effectiveDesc = problemDescription.trim();

    if (!effectiveTitle) {
      if (detectedInfo?.detected_problem) {
        effectiveTitle = detectedInfo.detected_problem;
      } else if (voiceTranscription.trim()) {
        const tr = voiceTranscription.trim();
        effectiveTitle = tr.length > 60 ? `${tr.slice(0, 57)}...` : tr;
      } else if (hasPhoto) {
        effectiveTitle = 'Problem Photo Inspection Request';
      }
    }

    if (!effectiveDesc) {
      if (voiceTranscription.trim()) {
        effectiveDesc = voiceTranscription.trim();
      } else if (hasPhoto) {
        effectiveDesc = 'Customer attached problem photo for visual inspection and repair.';
      } else if (effectiveTitle) {
        effectiveDesc = effectiveTitle;
      }
    }

    if (!selectedServiceId) {
      return setError('Please select a service category.');
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
    formData.append('problem_title', effectiveTitle);
    formData.append('problem_description', effectiveDesc);
    formData.append('urgency_level', urgencyLevel);
    formData.append('scheduled_date', scheduledDate);
    formData.append('scheduled_time_slot', scheduledTimeSlot);
    formData.append('service_address', serviceAddress.trim());
    formData.append('city', city.trim());
    formData.append('pincode', pincode.trim());
    if (geoCoords?.lat != null && geoCoords?.lon != null) {
      formData.append('latitude', geoCoords.lat);
      formData.append('longitude', geoCoords.lon);
    }
    if (imageFile) {
      formData.append('problem_image', imageFile);
    }
    if (audioBlob) {
      formData.append('voice_recording', audioBlob, 'voice-complaint.webm');
    }
    if (voiceTranscription.trim()) {
      formData.append('voice_transcription', voiceTranscription.trim());
    }
    if (detectedInfo?.detected_service) {
      formData.append('detected_service', detectedInfo.detected_service);
    }
    if (detectedInfo?.detected_problem) {
      formData.append('detected_problem', detectedInfo.detected_problem);
    }
    if (detectedInfo?.matched_keywords) {
      formData.append('detected_keywords', JSON.stringify(detectedInfo.matched_keywords));
    }
    if (audioBlob || voiceTranscription.trim() || detectedInfo) {
      formData.append('detection_method', 'rule_based_speech_to_text');
    }

    const result = await createBookingApi(formData, token);
    setSubmitting(false);

    if (result.ok && result.data.success) {
      setSuccessBooking(result.data.booking);
      setRecommendations(result.data.recommendations || []);
      setSelectedTech(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError(result.data?.message || 'Failed to submit service booking.');
    }
  };

  const handleConfirmTechnician = async () => {
    if (!successBooking || !confirmingTechnician) return;
    const techId = confirmingTechnician.technicianId || confirmingTechnician.technician_id || confirmingTechnician.id;
    setSelectingLoading(true);
    const res = await selectTechnicianApi(
      successBooking.id,
      techId,
      token
    );
    setSelectingLoading(false);
    if (res.ok && res.data.success) {
      setSelectedTech(confirmingTechnician);
      setConfirmingTechnician(null);
      setSuccessBooking((prev) => ({
        ...prev,
        booking_status: 'customer_selected_technician',
        technician_id: techId,
      }));
    } else {
      alert(res.data?.message || 'Failed to select technician.');
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  // =========================================================================
  // SUCCESS VIEW: BOOKING REGISTERED + INTELLIGENT TECHNICIAN RECOMMENDATIONS
  // =========================================================================
  if (successBooking) {
    return (
      <div className="py-5" style={{ backgroundColor: '#FAF7F2', minHeight: '85vh' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
              {/* Success Banner */}
              <div
                className="card p-4 p-md-5 mb-4 text-center border shadow-sm"
                style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center text-white mb-3 shadow-sm mx-auto"
                  style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#5F7654' }}
                >
                  <i className="bi bi-check-lg fs-1"></i>
                </div>
                <h3 className="fw-bold mb-1" style={{ color: '#3E3027' }}>Service Complaint Registered!</h3>
                <p className="small mx-auto mb-4" style={{ maxWidth: '540px', color: '#4A382C' }}>
                  Your booking reference is <strong className="font-monospace" style={{ color: '#5A3E2B' }}>{successBooking.booking_reference}</strong>.
                  Now select from the top recommended verified technicians below to confirm your appointment.
                </p>

                {/* Selection Notification */}
                {selectedTech && (
                  <div
                    className="alert d-flex align-items-center gap-3 p-3 text-start mb-4"
                    style={{ backgroundColor: '#EAF2E8', borderColor: '#C8D7C4', color: '#3B5233', borderRadius: '6px' }}
                  >
                    <i className="bi bi-check-circle-fill fs-4 flex-shrink-0" style={{ color: '#5F7654' }}></i>
                    <div>
                      <strong className="d-block" style={{ color: '#3B5233' }}>
                        Technician Selected: {selectedTech.technicianName}
                      </strong>
                      <span className="small" style={{ color: '#526E49' }}>
                        Your request has been dispatched. Status: <strong>Waiting for technician confirmation</strong>.
                      </span>
                    </div>
                  </div>
                )}

                {/* Summary Details Box */}
                <div
                  className="p-3 border text-start mb-4"
                  style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                >
                  <div className="row g-3 small">
                    <div className="col-12 col-sm-6 col-md-3">
                      <span className="d-block" style={{ color: '#4A382C' }}>Booking Reference:</span>
                      <strong className="font-monospace" style={{ color: '#5A3E2B' }}>{successBooking.booking_reference}</strong>
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <span className="d-block" style={{ color: '#4A382C' }}>Service:</span>
                      <strong style={{ color: '#3E3027' }}>{successBooking.service_name}</strong>
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <span className="d-block" style={{ color: '#4A382C' }}>Scheduled Slot:</span>
                      <strong style={{ color: '#3E3027' }}>
                        {new Date(successBooking.scheduled_date).toLocaleDateString()} &bull; {successBooking.scheduled_time_slot.split(' ')[0]}
                      </strong>
                    </div>
                    <div className="col-12 col-sm-6 col-md-3">
                      <span className="d-block" style={{ color: '#4A382C' }}>Estimated Base Price:</span>
                      <strong className="fs-6" style={{ color: '#5F7654' }}>₹{successBooking.estimated_cost}</strong>
                    </div>
                  </div>
                </div>

                {/* SECTION 9: INTELLIGENT TECHNICIAN RECOMMENDATION UI */}
                <div className="text-start">
                  <TechnicianRecommendationsList
                    recommendations={recommendations}
                    title="Recommended Technicians"
                    subtitle="Matched based on trade specialization, location proximity, customer rating, and availability."
                    onSelectTechnician={(tech) => setConfirmingTechnician(tech)}
                    selectedTechnicianId={selectedTech?.technicianId}
                    selectable={!selectedTech}
                    isSelecting={selectingLoading}
                  />
                </div>

                {/* Footer Actions */}
                <div className="d-flex justify-content-center gap-3 pt-3 border-top mt-4 flex-wrap" style={{ borderColor: '#D8C7B5' }}>
                  <Link to="/my-bookings" className="btn btn-primary px-4 shadow-sm">
                    <i className="bi bi-card-checklist me-1"></i> Track in My Bookings
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={() => {
                      setSuccessBooking(null);
                      setRecommendations([]);
                      setSelectedTech(null);
                      setProblemTitle('');
                      setProblemDescription('');
                      removeImage();
                      removeVoiceRecording();
                      setActiveStep(1);
                    }}
                  >
                    Book Another Service
                  </button>
                </div>
              </div>

              {/* Bottom / Footer Navigation Area */}
              <div className="mt-4 pt-3 border-top text-start" style={{ borderColor: '#D8C7B5' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-sm hf-btn-back d-inline-flex align-items-center gap-1.5"
                >
                  &larr; Back
                </button>
              </div>
            </div>
          </div>

          {/* CONFIRM TECHNICIAN MODAL */}
          {confirmingTechnician && (
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
                      <h5 className="modal-title fw-bold mb-0">Confirm Technician Selection</h5>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setConfirmingTechnician(null)}
                      disabled={selectingLoading}
                    ></button>
                  </div>

                  <div className="modal-body p-4 text-start">
                    <p className="small mb-3" style={{ color: '#4A382C' }}>
                      You are assigning <strong>{confirmingTechnician.technicianName}</strong> to this service request.
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
                          className="badge px-2 py-1 fw-bold"
                          style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
                        >
                          {confirmingTechnician.matchScore}% Match
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                        <span style={{ color: '#4A382C' }}>Rating &amp; Experience:</span>
                        <span style={{ color: '#3E3027' }}>
                          ★ {confirmingTechnician.averageRating || '5.0'} &bull; {confirmingTechnician.experienceYears || 2} Years Exp
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom" style={{ borderColor: '#D8C7B5' }}>
                        <span style={{ color: '#4A382C' }}>Estimated Distance:</span>
                        <strong style={{ color: '#5F7654' }}>
                          {confirmingTechnician.distanceKm ? `${confirmingTechnician.distanceKm} km` : 'Local Area'}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1 pt-2">
                        <span style={{ color: '#4A382C' }}>Visiting Fee:</span>
                        <strong className="fs-6" style={{ color: '#5A3E2B' }}>₹{confirmingTechnician.visitingCharges || 150}</strong>
                      </div>
                    </div>

                    <small className="d-block" style={{ color: '#4A382C' }}>
                      <i className="bi bi-info-circle me-1" style={{ color: '#5A3E2B' }}></i>
                      The technician will review the problem details and confirm the appointment.
                    </small>
                  </div>

                  <div
                    className="modal-footer p-3 border-top"
                    style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5' }}
                  >
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm px-3"
                      onClick={() => setConfirmingTechnician(null)}
                      disabled={selectingLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm"
                      onClick={handleConfirmTechnician}
                      disabled={selectingLoading}
                    >
                      {selectingLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                          <span>Assigning...</span>
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
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN MULTI-STEP BOOKING FLOW (STEPS 1, 2, 3, 4)
  // =========================================================================
  return (
    <div className="py-5" style={{ backgroundColor: '#FAF7F2', minHeight: '85vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="fw-bold mb-1" style={{ color: '#3E3027' }}>Book a Home Service</h3>
              <p className="small mb-0" style={{ color: '#4A382C' }}>
                Select your service, submit your complaint via Text, Photo, or Voice, and pick your time slot.
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div
              className="card p-3 mb-4 border"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              <div className="hf-stepper">
                <div
                  className={`hf-step-item cursor-pointer ${activeStep === 1 ? 'active' : activeStep > 1 ? 'completed' : ''}`}
                  onClick={() => setActiveStep(1)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="hf-step-circle">
                    {activeStep > 1 ? <i className="bi bi-check-lg"></i> : '01'}
                  </div>
                  <span className="hf-step-label">Service</span>
                </div>

                <div
                  className={`hf-step-item cursor-pointer ${activeStep === 2 ? 'active' : activeStep > 2 ? 'completed' : ''}`}
                  onClick={() => setActiveStep(2)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="hf-step-circle">
                    {activeStep > 2 ? <i className="bi bi-check-lg"></i> : '02'}
                  </div>
                  <span className="hf-step-label">Complaint</span>
                </div>

                <div
                  className={`hf-step-item cursor-pointer ${activeStep === 3 ? 'active' : activeStep > 3 ? 'completed' : ''}`}
                  onClick={() => setActiveStep(3)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="hf-step-circle">
                    {activeStep > 3 ? <i className="bi bi-check-lg"></i> : '03'}
                  </div>
                  <span className="hf-step-label">Location &amp; Schedule</span>
                </div>

                <div
                  className={`hf-step-item cursor-pointer ${activeStep === 4 ? 'active' : ''}`}
                  onClick={() => setActiveStep(4)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="hf-step-circle">04</div>
                  <span className="hf-step-label">Review</span>
                </div>

                <div className="hf-step-item opacity-50">
                  <div className="hf-step-circle">05</div>
                  <span className="hf-step-label">Technician Selection</span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 alert-dismissible fade show small py-2 mb-4" role="alert">
                <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                <div>{error}</div>
                <button type="button" className="btn-close" onClick={() => setError('')}></button>
              </div>
            )}

            <div
              className="card p-4 p-md-5 border shadow-sm"
              style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}
            >
              {/* ======================================================== */}
              {/* STEP 1: SELECT SERVICE */}
              {/* ======================================================== */}
              {activeStep === 1 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-0" style={{ color: '#3E3027' }}>Choose Service Category</h5>
                      <p className="small mb-0" style={{ color: '#4A382C' }}>Select the trade repair needed for your household.</p>
                    </div>
                    <span
                      className="badge border"
                      style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                    >
                      1 of 4
                    </span>
                  </div>

                  {loadingServices ? (
                    <div className="text-center py-5">
                      <div className="spinner-border" style={{ color: '#5A3E2B' }} role="status"></div>
                      <p className="small mt-2" style={{ color: '#4A382C' }}>Loading service catalog...</p>
                    </div>
                  ) : (
                    <div className="row g-3 mb-4">
                      {services.map((svc) => {
                        const isSelected = selectedServiceId === svc.id.toString();
                        const iconClass = SERVICE_ICONS[svc.name] || svc.icon || 'bi-tools';
                        const desc = SERVICE_DESCRIPTIONS[svc.name] || 'Professional home repair and installation service.';

                        return (
                          <div className="col-12 col-md-6 col-lg-4" key={svc.id}>
                            <div
                              className="p-3 border h-100"
                              onClick={() => setSelectedServiceId(svc.id.toString())}
                              style={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                backgroundColor: isSelected ? '#FAF5EE' : '#FFFDF9',
                                borderColor: isSelected ? '#5A3E2B' : '#D8C7B5',
                                borderWidth: isSelected ? '1.5px' : '1px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div className="d-flex align-items-start gap-3">
                                <div
                                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                                  style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '6px',
                                    fontSize: '1.25rem',
                                    backgroundColor: isSelected ? '#5A3E2B' : '#F5EFE6',
                                    color: isSelected ? '#FFFDF9' : '#5A3E2B',
                                    border: isSelected ? 'none' : '1px solid #D8C7B5',
                                  }}
                                >
                                  <i className={`bi ${iconClass}`}></i>
                                </div>
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <h6 className="fw-bold mb-0" style={{ color: '#3E3027' }}>{svc.name}</h6>
                                    {isSelected && (
                                      <i className="bi bi-check-circle-fill fs-5" style={{ color: '#5A3E2B' }}></i>
                                    )}
                                  </div>
                                  <p className="small mb-2" style={{ minHeight: '38px', fontSize: '0.8rem', color: '#4A382C' }}>
                                    {desc}
                                  </p>
                                  <span
                                    className="badge border"
                                    style={{ backgroundColor: '#FAF7F2', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                                  >
                                    Visiting from ₹{svc.base_price}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="d-flex justify-content-end pt-3 border-top" style={{ borderColor: '#D8C7B5' }}>
                    <button
                      type="button"
                      className="btn btn-primary px-4 shadow-sm"
                      onClick={() => setActiveStep(2)}
                    >
                      <span>Continue to Complaint</span>
                      <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: COMPLAINT (TEXT, IMAGE, VOICE) */}
              {/* ======================================================== */}
              {activeStep === 2 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-0" style={{ color: '#3E3027' }}>Describe Your Problem</h5>
                      <p className="small mb-0" style={{ color: '#4A382C' }}>
                        Submit details via Text, Photo, or Voice recording in Malayalam or English.
                      </p>
                    </div>
                    <span
                      className="badge border"
                      style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                    >
                      2 of 4
                    </span>
                  </div>

                  {/* Complaint Input Channels */}
                  <div
                    className="d-flex p-1 border mb-4 gap-1"
                    style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                  >
                    <button
                      type="button"
                      className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
                      style={{
                        backgroundColor: complaintTab === 'text' ? '#5A3E2B' : 'transparent',
                        color: complaintTab === 'text' ? '#FFFDF9' : '#4A382C',
                        borderRadius: '4px',
                      }}
                      onClick={() => setComplaintTab('text')}
                    >
                      <span>📝 Text Complaint</span>
                    </button>
                    <button
                      type="button"
                      className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
                      style={{
                        backgroundColor: complaintTab === 'image' ? '#5A3E2B' : 'transparent',
                        color: complaintTab === 'image' ? '#FFFDF9' : '#4A382C',
                        borderRadius: '4px',
                      }}
                      onClick={() => setComplaintTab('image')}
                    >
                      <span>🖼️ Upload Photo</span>
                      {imageFile && (
                        <span
                          className="badge"
                          style={{ backgroundColor: complaintTab === 'image' ? '#E8D8C7' : '#5A3E2B', color: complaintTab === 'image' ? '#5A3E2B' : '#FFFDF9' }}
                        >
                          1
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0"
                      style={{
                        backgroundColor: complaintTab === 'voice' ? '#5A3E2B' : 'transparent',
                        color: complaintTab === 'voice' ? '#FFFDF9' : '#4A382C',
                        borderRadius: '4px',
                      }}
                      onClick={() => setComplaintTab('voice')}
                    >
                      <span>🎙️ Voice Complaint</span>
                      {(audioBlob || voiceTranscription) && (
                        <span
                          className="badge"
                          style={{ backgroundColor: complaintTab === 'voice' ? '#E8D8C7' : '#5A3E2B', color: complaintTab === 'voice' ? '#5A3E2B' : '#FFFDF9' }}
                        >
                          Recorded
                        </span>
                      )}
                    </button>
                  </div>

                {/* CHANNEL 1: TEXT COMPLAINT */}
                {complaintTab === 'text' && (
                  <div className="p-3 bg-light rounded-3 border mb-4">
                    <div className="row g-3">
                      <div className="col-12 col-md-8">
                        <label className="form-label">
                          Problem Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Tap leaking continuously / AC not blowing cold air"
                          value={problemTitle}
                          onChange={(e) => setProblemTitle(e.target.value)}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Urgency Level</label>
                        <select
                          className="form-select"
                          value={urgencyLevel}
                          onChange={(e) => setUrgencyLevel(e.target.value)}
                        >
                          <option value="low">Low (Routine maintenance)</option>
                          <option value="medium">Medium (Standard 24-48 hrs)</option>
                          <option value="high">High (Needs quick fix)</option>
                          <option value="emergency">Emergency (Immediate hazard)</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Detailed Symptoms / Notes</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Provide any details about the fixture, appliance brand, or exact issue..."
                          value={problemDescription}
                          onChange={(e) => setProblemDescription(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHANNEL 2: IMAGE UPLOAD */}
                {complaintTab === 'image' && (
                  <div className="p-4 bg-light rounded-3 border mb-4 text-center">
                    {!imagePreview ? (
                      <div>
                        <i className="bi bi-camera-fill text-muted fs-1 mb-2 d-block"></i>
                        <h6 className="fw-bold text-dark mb-1">Attach a Problem Photo</h6>
                        <p className="text-muted small mb-3">
                          Upload a photo of the damaged pipe, socket, or unit (Max 5MB)
                        </p>
                        <input
                          type="file"
                          id="problem_photo_input"
                          className="d-none"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                        />
                        <label htmlFor="problem_photo_input" className="btn btn-outline-primary px-4 shadow-xs">
                          <i className="bi bi-upload me-1"></i> Select Photo
                        </label>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-between p-3 bg-white rounded-3 border">
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="rounded-2 object-fit-cover shadow-xs"
                            style={{ width: '80px', height: '80px' }}
                          />
                          <div className="text-start">
                            <strong className="text-dark d-block text-truncate" style={{ maxWidth: '240px' }}>
                              {imageFile?.name}
                            </strong>
                            <span className="text-muted small">{(imageFile?.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={removeImage}
                        >
                          <i className="bi bi-trash me-1"></i> Remove Photo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CHANNEL 3: VOICE COMPLAINT */}
                {complaintTab === 'voice' && (
                  <div className="p-4 bg-light rounded-3 border mb-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fs-4">🎙️</span>
                        <div>
                          <strong className="text-dark d-block">Voice Complaint Recorder</strong>
                          <span className="text-muted small">Record your complaint in English or Malayalam</span>
                        </div>
                      </div>

                      {/* Language Selector */}
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className={`btn ${speechLanguage === 'en-IN' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setSpeechLanguage('en-IN')}
                          disabled={isRecording}
                        >
                          <i className="bi bi-mic me-1"></i> Speak in English
                        </button>
                        <button
                          type="button"
                          className={`btn ${speechLanguage === 'ml-IN' ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setSpeechLanguage('ml-IN')}
                          disabled={isRecording}
                        >
                          <i className="bi bi-mic me-1"></i> Speak in Malayalam
                        </button>
                      </div>
                    </div>

                    {/* Speech Error */}
                    {speechError && (
                      <div className="alert alert-warning py-2 px-3 small mb-3">
                        <i className="bi bi-exclamation-triangle me-1"></i> {speechError}
                      </div>
                    )}

                    {/* Recording Action Bar */}
                    <div className="p-3 bg-white rounded-3 border text-center mb-3">
                      {!isRecording && !audioUrl && (
                        <div>
                          <button
                            type="button"
                            className="btn btn-danger btn-lg px-4 py-2.5 shadow-sm d-inline-flex align-items-center gap-2"
                            style={{ borderRadius: '6px' }}
                            onClick={startRecording}
                          >
                            <i className="bi bi-mic-fill fs-5"></i>
                            <span>Start Speaking</span>
                          </button>
                          <span className="d-block small mt-2" style={{ color: '#4A382C' }}>
                            Speak clearly into your microphone
                          </span>
                        </div>
                      )}

                      {isRecording && (
                        <div className="d-flex align-items-center justify-content-between p-2">
                          <div className="d-flex align-items-center gap-3">
                            <span className="spinner-grow spinner-grow-sm text-danger" role="status"></span>
                            <span className="fw-bold text-danger">
                              Listening... <span className="font-monospace fs-5 ms-1">{formatTime(recordingSeconds)}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm px-3 shadow-xs"
                            style={{ borderRadius: '6px' }}
                            onClick={stopRecording}
                          >
                            <i className="bi bi-stop-circle-fill me-1"></i> Stop Recording
                          </button>
                        </div>
                      )}

                      {!isRecording && audioUrl && (
                        <div className="d-flex flex-column gap-2 text-start">
                          <div className="d-flex justify-content-between align-items-center">
                            <span
                              className="badge px-2.5 py-1 fw-medium"
                              style={{ backgroundColor: 'rgba(95, 118, 84, 0.12)', color: '#5F7654', border: '1px solid #5F7654', borderRadius: '4px' }}
                            >
                              <i className="bi bi-check2 me-1"></i> Audio Recorded ({formatTime(recordingSeconds)})
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm py-0 px-2"
                              onClick={removeVoiceRecording}
                            >
                              <i className="bi bi-trash me-1"></i> Re-record
                            </button>
                          </div>
                          <audio controls src={audioUrl} className="w-100 mt-2" />
                        </div>
                      )}
                    </div>

                    {/* Real-time Transcription Box */}
                    <div>
                      <label className="form-label d-flex justify-content-between align-items-center" style={{ color: '#3E3027' }}>
                        <span>Speech Transcription (Editable):</span>
                        <span style={{ fontSize: '0.75rem', color: '#4A382C' }}>You can adjust words below</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Live transcribed words will display here. You can also manually type text in Malayalam or English..."
                        value={voiceTranscription}
                        onChange={(e) => {
                          setVoiceTranscription(e.target.value);
                          const detected = detectComplaintDetails(e.target.value);
                          if (detected.match_found) setDetectedInfo(detected);
                        }}
                      ></textarea>
                    </div>

                    {/* Detected Problem Card */}
                    {detectedInfo && detectedInfo.match_found && (
                      <div
                        className="alert mt-3 p-3 border mb-0"
                        style={{ backgroundColor: '#EAF2E8', borderColor: '#C8D7C4', color: '#3B5233', borderRadius: '6px' }}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                          <strong className="d-flex align-items-center gap-1" style={{ color: '#3B5233' }}>
                            <i className="bi bi-patch-check-fill" style={{ color: '#5F7654' }}></i> Auto-Identified Issue
                          </strong>
                          <span
                            className="badge border"
                            style={{ backgroundColor: '#FFFDF9', color: '#5F7654', borderColor: '#C8D7C4', borderRadius: '4px' }}
                          >
                            Matched Service
                          </span>
                        </div>
                        <div className="row g-2 small mb-2">
                          <div className="col-6">
                            <span className="d-block" style={{ color: '#526E49' }}>Suggested Trade:</span>
                            <strong style={{ color: '#3B5233' }}>{detectedInfo.detected_service}</strong>
                          </div>
                          <div className="col-6">
                            <span className="d-block" style={{ color: '#526E49' }}>Suggested Problem:</span>
                            <strong style={{ color: '#3B5233' }}>{detectedInfo.detected_problem}</strong>
                          </div>
                        </div>
                        <div className="d-flex justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm px-3 shadow-xs text-white"
                            style={{ backgroundColor: '#5F7654', borderRadius: '4px' }}
                            onClick={handleApplyDetectedComplaint}
                          >
                            <i className="bi bi-check2-circle me-1"></i> Apply to Booking Form
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="d-flex justify-content-between pt-3 border-top" style={{ borderColor: '#D8C7B5' }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setActiveStep(1)}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Service
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4 shadow-sm"
                    onClick={() => setActiveStep(3)}
                  >
                    <span>Continue to Schedule</span>
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: SCHEDULE & LOCATION */}
            {/* ======================================================== */}
            {activeStep === 3 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold mb-0" style={{ color: '#3E3027' }}>Appointment &amp; Service Address</h5>
                    <p className="small mb-0" style={{ color: '#4A382C' }}>Specify where and when the technician should visit.</p>
                  </div>
                  <span
                    className="badge border"
                    style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                  >
                    3 of 4
                  </span>
                </div>

                <div
                  className="p-3 border mb-4"
                  style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                >
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold" style={{ color: '#3E3027' }}>
                        Preferred Date <span className="text-danger">*</span>
                      </label>
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
                      <label className="form-label small fw-semibold" style={{ color: '#3E3027' }}>
                        Preferred Time Slot <span className="text-danger">*</span>
                      </label>
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
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold mb-0" style={{ color: '#3E3027' }}>
                          Service Address <span className="text-danger">*</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          style={{ borderColor: '#D8C7B5', color: '#5A3E2B' }}
                          onClick={handleDetectLocation}
                          disabled={locating}
                          title="Auto-detect current GPS coordinates"
                        >
                          <i className={`bi bi-geo-alt-fill me-1 text-danger ${locating ? 'spin' : ''}`}></i>
                          <span>{locating ? 'Detecting GPS...' : geoCoords ? 'GPS Attached' : 'Auto-Detect Location'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="House / Flat No., Apartment Name, Street, Landmark"
                        value={serviceAddress}
                        onChange={(e) => setServiceAddress(e.target.value)}
                        required
                      />
                      {locationMessage && (
                        <small className={`d-block mt-1 ${geoCoords ? 'text-success' : 'text-muted'}`}>
                          <i className={`bi ${geoCoords ? 'bi-check-circle-fill text-success' : 'bi-info-circle'} me-1`}></i>
                          {locationMessage}
                        </small>
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold" style={{ color: '#3E3027' }}>
                        City <span className="text-danger">*</span>
                      </label>
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
                      <label className="form-label small fw-semibold" style={{ color: '#3E3027' }}>
                        Pincode <span className="text-danger">*</span>
                      </label>
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
                </div>

                <div className="d-flex justify-content-between pt-3 border-top" style={{ borderColor: '#D8C7B5' }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setActiveStep(2)}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Complaint
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4 shadow-sm"
                    onClick={() => setActiveStep(4)}
                  >
                    <span>Proceed to Review</span>
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4: REVIEW & CONFIRM BOOKING */}
            {/* ======================================================== */}
            {activeStep === 4 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold mb-0" style={{ color: '#3E3027' }}>Review Booking Summary</h5>
                    <p className="small mb-0" style={{ color: '#4A382C' }}>
                      Verify your complaint and schedule before creating the service request.
                    </p>
                  </div>
                  <span
                    className="badge border"
                    style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', borderColor: '#D8C7B5', borderRadius: '4px' }}
                  >
                    4 of 4
                  </span>
                </div>

                {/* Review Card */}
                <div
                  className="p-4 border mb-4"
                  style={{ backgroundColor: '#FAF7F2', borderColor: '#D8C7B5', borderRadius: '6px' }}
                >
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <span className="small d-block" style={{ color: '#4A382C' }}>Selected Service:</span>
                      <strong className="fs-6 d-flex align-items-center gap-1.5" style={{ color: '#3E3027' }}>
                        <i className={`bi ${SERVICE_ICONS[selectedService?.name] || 'bi-tools'}`} style={{ color: '#5A3E2B' }}></i>
                        <span>{selectedService?.name || 'Selected Service'}</span>
                      </strong>
                    </div>

                    <div className="col-12 col-md-6">
                      <span className="small d-block" style={{ color: '#4A382C' }}>Urgency Level:</span>
                      <span
                        className="badge text-uppercase"
                        style={{ backgroundColor: '#A9793F', color: '#FFFDF9', borderRadius: '4px' }}
                      >
                        {urgencyLevel}
                      </span>
                    </div>

                    <div className="col-12 col-md-6">
                      <span className="small d-block" style={{ color: '#4A382C' }}>Appointment Schedule:</span>
                      <strong style={{ color: '#3E3027' }}>
                        <i className="bi bi-calendar-event me-1" style={{ color: '#5A3E2B' }}></i>
                        {new Date(scheduledDate).toLocaleDateString()} &bull; {scheduledTimeSlot}
                      </strong>
                    </div>

                    <div className="col-12 col-md-6">
                      <span className="small d-block" style={{ color: '#4A382C' }}>Service Address:</span>
                      <span style={{ color: '#3E3027' }}>
                        <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                        {serviceAddress || 'Address not entered'}, {city} - {pincode}
                      </span>
                    </div>

                    <div className="col-12 pt-2 border-top" style={{ borderColor: '#D8C7B5' }}>
                      <span className="small d-block" style={{ color: '#4A382C' }}>Complaint Summary:</span>
                      <p className="fw-medium mb-1" style={{ color: '#3E3027' }}>
                        {problemTitle || voiceTranscription || (imageFile ? 'Photo attached' : 'No title specified')}
                      </p>
                      {problemDescription && (
                        <p className="small mb-0" style={{ color: '#4A382C' }}>{problemDescription}</p>
                      )}
                    </div>

                    {/* Attachments Indicator */}
                    <div className="col-12 pt-2 border-top d-flex gap-3 flex-wrap" style={{ borderColor: '#D8C7B5' }}>
                      {imageFile && (
                        <span
                          className="badge border p-2 d-inline-flex align-items-center gap-1"
                          style={{ backgroundColor: '#FFFDF9', color: '#3E3027', borderColor: '#D8C7B5', borderRadius: '4px' }}
                        >
                          <i className="bi bi-image" style={{ color: '#5A3E2B' }}></i>
                          <span>Photo Attached ({imageFile.name})</span>
                        </span>
                      )}
                      {(audioBlob || voiceTranscription) && (
                        <span
                          className="badge border p-2 d-inline-flex align-items-center gap-1"
                          style={{ backgroundColor: '#FFFDF9', color: '#3E3027', borderColor: '#D8C7B5', borderRadius: '4px' }}
                        >
                          <i className="bi bi-mic-fill text-danger"></i>
                          <span>Voice Complaint Attached</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Estimated Billing Preview */}
                <div
                  className="p-3 border d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4"
                  style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '6px' }}
                >
                  <div>
                    <span className="small d-block" style={{ color: '#4A382C' }}>Estimated Base Visiting Fee:</span>
                    <strong className="fs-6" style={{ color: '#3E3027' }}>Diagnosis &amp; Visit Charges</strong>
                  </div>
                  <div className="text-end">
                    <span className="fs-4 fw-bold" style={{ color: '#5A3E2B' }}>
                      ₹{selectedService ? selectedService.base_price : '150'}
                    </span>
                  </div>
                </div>

                <div className="d-flex justify-content-between pt-3 border-top" style={{ borderColor: '#D8C7B5' }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setActiveStep(3)}
                    disabled={submitting}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Schedule
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg px-4 fw-semibold shadow-sm d-flex align-items-center gap-2"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Creating Booking...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-calendar-check-fill"></i>
                        <span>Create Booking</span>
                      </>
                    )}
                  </button>
                </div>
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
        </div>
      </div>
    </div>
  </div>
  );
}
