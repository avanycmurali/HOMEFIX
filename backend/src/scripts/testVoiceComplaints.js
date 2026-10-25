import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';
import { detectComplaintDetails, SERVICE_RULES } from '../utils/complaintDetectionEngine.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function api(endpoint, options = {}) {
  const { headers = {}, body, ...restOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const requestHeaders = { ...headers };
  if (!isFormData && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
    body: isFormData ? body : (typeof body === 'object' ? JSON.stringify(body) : body),
  });

  const contentType = res.headers.get('content-type') || '';
  let data = {};
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text().catch(() => '');
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runVoiceComplaintTests() {
  console.log('🧪 Starting HOMEFIX Voice Complaint, Speech-to-Text & Detection Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // 0. Ensure uploads/complaints directory exists
    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'complaints');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a dummy audio file for testing
    const testAudioPath = path.join(uploadsDir, `test-sample-${timestamp}.webm`);
    fs.writeFileSync(testAudioPath, Buffer.from('FAKE-WEBM-AUDIO-HEADER-SAMPLE-DATA-HOMEFIX'));

    // Create a dummy image file for testing
    const testImagePath = path.join(uploadsDir, `test-sample-${timestamp}.jpg`);
    fs.writeFileSync(testImagePath, Buffer.from('FAKE-JPEG-IMAGE-HEADER-SAMPLE-DATA-HOMEFIX'));

    // =========================================================================
    // PART 1: DETERMINISTIC COMPLAINT DETECTION UNIT TESTS (English & Malayalam)
    // =========================================================================
    console.log('--- Unit Testing Deterministic Rule-Based Complaint Detection Engine ---');

    // 1. Plumbing - English
    const plumbingEn = detectComplaintDetails('The kitchen sink tap is leaking and dripping water continuously');
    assert(plumbingEn.match_found === true, '1. English Plumbing: Match found');
    assert(plumbingEn.detected_service === 'Plumbing Services', '1b. Correct service: Plumbing Services');
    assert(plumbingEn.detected_problem === 'Tap Leakage / Repair', `1c. Problem type: Tap Leakage / Repair (got: ${plumbingEn.detected_problem})`);
    assert(plumbingEn.matched_keywords.includes('tap') && plumbingEn.matched_keywords.includes('water'), '1d. Matched keywords include tap and water');

    // 2. Electrical - English
    const electricalEn = detectComplaintDetails('Ceiling fan is making humming noise and wall switch sparking');
    assert(electricalEn.match_found === true, '2. English Electrical: Match found');
    assert(electricalEn.detected_service === 'Electrical Services', '2b. Correct service: Electrical Services');
    assert(electricalEn.detected_problem === 'Fan Repair / Replacement', `2c. Problem type: Fan Repair / Replacement (got: ${electricalEn.detected_problem})`);
    assert(electricalEn.matched_keywords.includes('fan'), '2d. Matched keyword fan');

    // 3. AC & Appliance - English
    const acEn = detectComplaintDetails('Split air conditioner is running but cooling is not working, gas refill needed');
    assert(acEn.match_found === true, '3. English AC & Appliance: Match found');
    assert(acEn.detected_service === 'AC & Appliance Repair', '3b. Correct service: AC & Appliance Repair');
    assert(acEn.detected_problem === 'AC Not Cooling / Gas Refill', `3c. Problem type: AC Not Cooling / Gas Refill (got: ${acEn.detected_problem})`);

    // 4. Carpentry - English
    const carpentryEn = detectComplaintDetails('Main entrance wooden door lock is jammed and hinges are loose');
    assert(carpentryEn.match_found === true, '4. English Carpentry: Match found');
    assert(carpentryEn.detected_service === 'Carpentry Services', '4b. Correct service: Carpentry Services');
    assert(carpentryEn.detected_problem === 'Door / Lock Repair', '4c. Problem type: Door / Lock Repair');

    // 5. Cleaning - English
    const cleaningEn = detectComplaintDetails('Need deep cleaning for dirty floor, dusty kitchen, and bathrooms');
    assert(cleaningEn.match_found === true, '5. English Cleaning: Match found');
    assert(cleaningEn.detected_service === 'Deep Home Cleaning', '5b. Correct service: Deep Home Cleaning');

    // 6. Painting - English
    const paintingEn = detectComplaintDetails('Living room wall paint is peeling off with dampness marks');
    assert(paintingEn.match_found === true, '6. English Painting: Match found');
    assert(paintingEn.detected_service === 'Home Painting', '6b. Correct service: Home Painting');
    assert(paintingEn.detected_problem === 'Wall Dampness / Leak Stains Touchup', '6c. Problem type: Wall Dampness / Leak Stains Touchup');

    // 7. Plumbing - Malayalam (ടാപ്പ് ചോർച്ച)
    const plumbingMl1 = detectComplaintDetails('അടുക്കളയിലെ ടാപ്പ് ചോർച്ചയുണ്ട്, വെള്ളം പോകുന്നു');
    assert(plumbingMl1.match_found === true, '7. Malayalam Plumbing (ടാപ്പ്): Match found');
    assert(plumbingMl1.detected_service === 'Plumbing Services', '7b. Service: Plumbing Services');
    assert(plumbingMl1.detected_problem === 'Tap Leakage / Repair', `7c. Problem type: Tap Leakage / Repair (got: ${plumbingMl1.detected_problem})`);
    assert(plumbingMl1.matched_keywords.includes('ടാപ്പ്') && plumbingMl1.matched_keywords.includes('വെള്ളം'), '7d. Matched keywords: ടാപ്പ്, വെള്ളം');

    // 8. Plumbing - Malayalam (പൈപ്പ് പൊട്ടി)
    const plumbingMl2 = detectComplaintDetails('കുളിമുറിയിലെ പൈപ്പ് പൊട്ടി വെള്ളം ചോരുന്നു');
    assert(plumbingMl2.match_found === true, '8. Malayalam Plumbing (പൈപ്പ് പൊട്ടി): Match found');
    assert(plumbingMl2.detected_problem === 'Pipe Leakage / Burst', `8b. Problem: Pipe Leakage / Burst (got: ${plumbingMl2.detected_problem})`);

    // 9. Electrical - Malayalam (ഫാൻ, സ്വിച്ച്)
    const electricalMl = detectComplaintDetails('ഹാളിലെ ഫാൻ കറങ്ങുന്നില്ല, സ്വിച്ച് ഓണാകുന്നില്ല');
    assert(electricalMl.match_found === true, '9. Malayalam Electrical: Match found');
    assert(electricalMl.detected_service === 'Electrical Services', '9b. Service: Electrical Services');
    assert(electricalMl.detected_problem === 'Fan Repair / Replacement', '9c. Problem: Fan Repair / Replacement');

    // 10. AC - Malayalam (എസി, തണുപ്പ്, കൂളിംഗ്)
    const acMl = detectComplaintDetails('മുറിയിലെ എസി തണുക്കുന്നില്ല, കൂളിംഗ് ഒട്ടും കിട്ടുന്നില്ല');
    assert(acMl.match_found === true, '10. Malayalam AC: Match found');
    assert(acMl.detected_service === 'AC & Appliance Repair', '10b. Service: AC & Appliance Repair');
    assert(acMl.detected_problem === 'AC Not Cooling / Gas Refill', '10c. Problem: AC Not Cooling / Gas Refill');

    // 11. Carpentry - Malayalam (വാതിൽ, പൂട്ട്)
    const carpentryMl = detectComplaintDetails('വീട്ടിലെ മുൻവശത്തെ വാതിൽ പൂട്ട് കേടായി അടയ്ക്കാൻ പറ്റുന്നില്ല');
    assert(carpentryMl.match_found === true, '11. Malayalam Carpentry: Match found');
    assert(carpentryMl.detected_service === 'Carpentry Services', '11b. Service: Carpentry Services');
    assert(carpentryMl.detected_problem === 'Door / Lock Repair', '11c. Problem: Door / Lock Repair');

    // 12. Cleaning - Malayalam (വൃത്തിയാക്കൽ, അഴുക്ക്)
    const cleaningMl = detectComplaintDetails('വീട് മുഴുവൻ വൃത്തിയാക്കൽ വേണം, നല്ല അഴുക്ക് ഉണ്ട്');
    assert(cleaningMl.match_found === true, '12. Malayalam Cleaning: Match found');
    assert(cleaningMl.detected_service === 'Deep Home Cleaning', '12b. Service: Deep Home Cleaning');

    // 13. Painting - Malayalam (ഭിത്തി, പെയിന്റ്, ചായം)
    const paintingMl = detectComplaintDetails('ഭിത്തിയിലെ പെയിന്റ് ഇളകിപ്പോയി, ചായം പൂശൽ വേണം');
    assert(paintingMl.match_found === true, '13. Malayalam Painting: Match found');
    assert(paintingMl.detected_service === 'Home Painting', '13b. Service: Home Painting');

    // 14. Mixed English + Malayalam (Manglish / Code-switching)
    const mixedLang = detectComplaintDetails('Kitchen sink pipe-ൽ leak ഉണ്ട്, വെള്ളം leak ആകുന്നു');
    assert(mixedLang.match_found === true, '14. Mixed Lang (English + Malayalam): Match found');
    assert(mixedLang.detected_service === 'Plumbing Services', '14b. Service: Plumbing Services');
    assert(mixedLang.matched_keywords.includes('pipe') && mixedLang.matched_keywords.includes('വെള്ളം'), '14c. Matched both English and Malayalam keywords');

    // 15. Safe handling on empty/invalid input
    const emptyDetect = detectComplaintDetails('');
    assert(emptyDetect.match_found === false, '15. Empty string returns match_found false safely');
    assert(emptyDetect.detection_method === 'rule_based_speech_to_text', '15b. Detection method is rule_based_speech_to_text (Never AI)');

    // =========================================================================
    // PART 2: ACTORS SETUP (Owner Customer, Other Customer, Assigned Tech, Other Tech)
    // =========================================================================
    console.log('\n--- Setting Up Test Accounts for API Flow & Access Control ---');

    // Register Customer 1 (Owner)
    const cust1Email = `voice_cust1_${timestamp}@example.com`;
    const regCust1 = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Voice Tester One',
        email: cust1Email,
        password: 'Password123!',
        phone: '9847000101',
        city: 'Kochi',
        pincode: '682001',
        address: '123 Marine Drive',
      },
    });
    assert(regCust1.ok, 'Registered Customer 1 (Owner)');
    const tokenCust1 = regCust1.data.token;
    const userCust1 = regCust1.data.user;

    // Register Customer 2 (Other Customer)
    const cust2Email = `voice_cust2_${timestamp}@example.com`;
    const regCust2 = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Voice Tester Two',
        email: cust2Email,
        password: 'Password123!',
        phone: '9847000102',
        city: 'Kochi',
        pincode: '682001',
        address: '456 MG Road',
      },
    });
    assert(regCust2.ok, 'Registered Customer 2 (Non-Owner)');
    const tokenCust2 = regCust2.data.token;

    // Register Tech 1 (Will be assigned)
    const tech1Email = `voice_tech1_${timestamp}@example.com`;
    const regTech1 = await api('/auth/register-technician', {
      method: 'POST',
      body: {
        name: 'Tech Electrician One',
        email: tech1Email,
        password: 'Password123!',
        phone: '9847000201',
        service_id: 1, // Electrical
        experience_years: 5,
        hourly_rate: 300,
        visiting_charges: 150,
        service_area: 'Kochi Central',
        city: 'Kochi',
        pincode: '682001',
      },
    });
    assert(regTech1.ok, 'Registered Tech 1');
    const tokenTech1 = regTech1.data.token;
    const tech1UserId = regTech1.data.user.id;
    const [tech1Profiles] = await pool.query('SELECT id FROM technician_profiles WHERE user_id = ?', [tech1UserId]);
    const tech1ProfileId = tech1Profiles[0].id;

    // Register Tech 2 (Unassigned Tech)
    const tech2Email = `voice_tech2_${timestamp}@example.com`;
    const regTech2 = await api('/auth/register-technician', {
      method: 'POST',
      body: {
        name: 'Tech Electrician Two',
        email: tech2Email,
        password: 'Password123!',
        phone: '9847000202',
        service_id: 1, // Electrical
        experience_years: 3,
        hourly_rate: 250,
        visiting_charges: 100,
        service_area: 'Kochi South',
        city: 'Kochi',
        pincode: '682001',
      },
    });
    assert(regTech2.ok, 'Registered Tech 2 (Unassigned)');
    const tokenTech2 = regTech2.data.token;

    // =========================================================================
    // PART 3: ALL 7 COMPLAINT COMBINATIONS VIA POST /api/bookings
    // =========================================================================
    console.log('\n--- Testing All 7 Complaint Input Combinations ---');

    // Combination 1: Text Only (Baseline)
    const formComb1 = new FormData();
    formComb1.append('service_id', '1');
    formComb1.append('problem_title', 'Switchboard Sparking');
    formComb1.append('problem_description', 'Sparking heard when turning on geyser switch');
    formComb1.append('scheduled_date', '2026-10-01');
    formComb1.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formComb1.append('service_address', '123 Marine Drive');
    formComb1.append('city', 'Kochi');
    formComb1.append('pincode', '682001');

    const resComb1 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb1,
    });
    assert(resComb1.ok, 'Combination 1: Text-only booking created successfully (200 OK)');
    assert(resComb1.data.booking.problem_title === 'Switchboard Sparking', 'Comb 1: Problem title preserved');

    // Combination 2: Voice Only (Audio + transcription + auto-generated title/description)
    const formComb2 = new FormData();
    const audioBlob2 = new Blob([fs.readFileSync(testAudioPath)], { type: 'audio/webm' });
    formComb2.append('service_id', '2');
    formComb2.append('voice_recording', audioBlob2, 'voice-comb2.webm');
    formComb2.append('voice_transcription', 'അടുക്കളയിലെ ടാപ്പ് ചോർച്ചയുണ്ട്, വെള്ളം മുഴുവൻ ലീക്ക് ആകുന്നു');
    formComb2.append('scheduled_date', '2026-10-01');
    formComb2.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formComb2.append('service_address', '123 Marine Drive');
    formComb2.append('city', 'Kochi');
    formComb2.append('pincode', '682001');

    const resComb2 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb2,
    });
    assert(resComb2.ok, 'Combination 2: Voice-only booking created successfully (200 OK)');
    const b2 = resComb2.data.booking;
    assert(b2.voice_complaint_url !== null, 'Comb 2: voice_complaint_url persisted in DB');
    assert(b2.voice_transcription.includes('ടാപ്പ് ചോർച്ചയുണ്ട്'), 'Comb 2: voice_transcription persisted in DB');
    assert(b2.detected_problem !== null, `Comb 2: detected_problem populated automatically (${b2.detected_problem})`);
    assert(b2.problem_title !== '', 'Comb 2: problem_title auto-populated from voice');
    assert(b2.problem_description !== '', 'Comb 2: problem_description auto-populated from voice');

    // Combination 3: Image Only (Auto-generated title/desc)
    const formComb3 = new FormData();
    const imageBlob3 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/jpeg' });
    formComb3.append('service_id', '3');
    formComb3.append('problem_image', imageBlob3, 'comb3.jpg');
    formComb3.append('scheduled_date', '2026-10-01');
    formComb3.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formComb3.append('service_address', '123 Marine Drive');
    formComb3.append('city', 'Kochi');
    formComb3.append('pincode', '682001');

    const resComb3 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb3,
    });
    assert(resComb3.ok, 'Combination 3: Image-only booking created successfully (200 OK)');
    assert(resComb3.data.booking.problem_image_url !== null, 'Comb 3: problem_image_url saved');
    assert(resComb3.data.booking.problem_title === 'Problem Photo Inspection Request', 'Comb 3: Smart default title applied');

    // Combination 4: Text + Image
    const formComb4 = new FormData();
    const imageBlob4 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/jpeg' });
    formComb4.append('service_id', '1');
    formComb4.append('problem_title', 'Ceiling Fan Broken Blade');
    formComb4.append('problem_description', 'Attached photo of cracked fan blade');
    formComb4.append('problem_image', imageBlob4, 'comb4.jpg');
    formComb4.append('scheduled_date', '2026-10-01');
    formComb4.append('scheduled_time_slot', 'Evening (03:00 PM - 06:00 PM)');
    formComb4.append('service_address', '123 Marine Drive');
    formComb4.append('city', 'Kochi');
    formComb4.append('pincode', '682001');

    const resComb4 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb4,
    });
    assert(resComb4.ok, 'Combination 4: Text + Image booking created successfully (200 OK)');
    assert(resComb4.data.booking.problem_image_url !== null, 'Comb 4: Image saved');

    // Combination 5: Text + Voice
    const formComb5 = new FormData();
    const audioBlob5 = new Blob([fs.readFileSync(testAudioPath)], { type: 'audio/webm' });
    formComb5.append('service_id', '4');
    formComb5.append('problem_title', 'AC Not Cooling');
    formComb5.append('problem_description', 'Customer notes: Fan works but no cold air');
    formComb5.append('voice_recording', audioBlob5, 'comb5.webm');
    formComb5.append('voice_transcription', 'മുറിയിലെ എസി തണുക്കുന്നില്ല, കൂളിംഗ് ഒട്ടും കിട്ടുന്നില്ല');
    formComb5.append('scheduled_date', '2026-10-01');
    formComb5.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formComb5.append('service_address', '123 Marine Drive');
    formComb5.append('city', 'Kochi');
    formComb5.append('pincode', '682001');

    const resComb5 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb5,
    });
    assert(resComb5.ok, 'Combination 5: Text + Voice booking created successfully (200 OK)');
    assert(resComb5.data.booking.voice_complaint_url !== null, 'Comb 5: Voice audio saved');
    assert(resComb5.data.booking.voice_transcription !== null, 'Comb 5: Voice transcription saved');

    // Combination 6: Image + Voice
    const formComb6 = new FormData();
    const audioBlob6 = new Blob([fs.readFileSync(testAudioPath)], { type: 'audio/webm' });
    const imageBlob6 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/jpeg' });
    formComb6.append('service_id', '2');
    formComb6.append('problem_image', imageBlob6, 'comb6.jpg');
    formComb6.append('voice_recording', audioBlob6, 'comb6.webm');
    formComb6.append('voice_transcription', 'Water is leaking from under the kitchen sink drain');
    formComb6.append('scheduled_date', '2026-10-01');
    formComb6.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formComb6.append('service_address', '123 Marine Drive');
    formComb6.append('city', 'Kochi');
    formComb6.append('pincode', '682001');

    const resComb6 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb6,
    });
    assert(resComb6.ok, 'Combination 6: Image + Voice booking created successfully (200 OK)');
    assert(resComb6.data.booking.problem_image_url !== null, 'Comb 6: Image saved');
    assert(resComb6.data.booking.voice_complaint_url !== null, 'Comb 6: Audio saved');

    // Combination 7: Text + Image + Voice (Complete Multimodal Complaint)
    const formComb7 = new FormData();
    const audioBlob7 = new Blob([fs.readFileSync(testAudioPath)], { type: 'audio/webm' });
    const imageBlob7 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/jpeg' });
    formComb7.append('service_id', '1');
    formComb7.append('problem_title', 'Hall Light and Fan Tripping MCB');
    formComb7.append('problem_description', 'Turning on hall light trips the main MCB breaker immediately');
    formComb7.append('problem_image', imageBlob7, 'comb7.jpg');
    formComb7.append('voice_recording', audioBlob7, 'comb7.webm');
    formComb7.append('voice_transcription', 'Hall light switch trips the MCB breaker with sparking');
    formComb7.append('scheduled_date', '2026-10-02');
    formComb7.append('scheduled_time_slot', 'Morning (09:00 AM - 12:00 PM)');
    formComb7.append('service_address', '123 Marine Drive');
    formComb7.append('city', 'Kochi');
    formComb7.append('pincode', '682001');

    const resComb7 = await api('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust1}` },
      body: formComb7,
    });
    assert(resComb7.ok, 'Combination 7: Text + Image + Voice booking created successfully (200 OK)');
    const targetBooking = resComb7.data.booking;
    assert(targetBooking.problem_image_url !== null, 'Comb 7: Photo attached');
    assert(targetBooking.voice_complaint_url !== null, 'Comb 7: Voice recording attached');
    assert(targetBooking.voice_transcription !== null, 'Comb 7: Transcription attached');
    assert(targetBooking.detected_service === 'Electrical Services', 'Comb 7: Detected service correct');
    assert(targetBooking.detected_problem !== null, 'Comb 7: Detected problem populated');
    assert(targetBooking.detection_method === 'rule_based_speech_to_text', 'Comb 7: Detection method is rule_based_speech_to_text');

    // Verify recommendations were generated via existing engine
    assert(Array.isArray(resComb7.data.recommendations) && resComb7.data.recommendations.length > 0, 'Comb 7: Recommendations generated by existing engine');

    // =========================================================================
    // PART 4: AUDIO FILE STORAGE VERIFICATION (Filesystem vs Database)
    // =========================================================================
    console.log('\n--- Verifying Audio Storage Architecture ---');
    const [dbRows] = await pool.query('SELECT voice_complaint_url FROM bookings WHERE id = ?', [targetBooking.id]);
    assert(dbRows.length > 0, 'Booking record fetched from MySQL');
    const dbUrl = dbRows[0].voice_complaint_url;
    assert(typeof dbUrl === 'string' && dbUrl.startsWith('/uploads/complaints/voice-'), 'voice_complaint_url stores path/URL (not raw binary blob)');

    const expectedDiskFile = path.resolve(process.cwd(), dbUrl.replace(/^\/+/, ''));
    assert(fs.existsSync(expectedDiskFile), 'Voice recording audio file exists in uploads/complaints/ directory');

    // =========================================================================
    // PART 5: SECURITY & ACCESS CONTROL ON GET /api/bookings/:id/voice-recording
    // =========================================================================
    console.log('\n--- Verifying Voice Recording Streaming & Access Control ---');

    // 1. Unauthenticated access rejected
    const unauthRes = await api(`/bookings/${targetBooking.id}/voice-recording`);
    assert(unauthRes.status === 401, 'Unauthenticated request to stream audio rejected (401 Unauthorized)');

    // 2. Owner Customer CAN access own voice recording
    const ownerStreamRes = await api(`/bookings/${targetBooking.id}/voice-recording`, {
      headers: { Authorization: `Bearer ${tokenCust1}` },
    });
    assert(ownerStreamRes.status === 200, 'Customer owner can access and stream own voice complaint (200 OK)');
    assert(ownerStreamRes.headers.get('content-type')?.includes('audio/'), 'Audio stream Content-Type is audio/*');

    // 3. Other Customer CANNOT access voice recording
    const otherCustRes = await api(`/bookings/${targetBooking.id}/voice-recording`, {
      headers: { Authorization: `Bearer ${tokenCust2}` },
    });
    assert(otherCustRes.status === 403, 'Other customer rejected with 403 Forbidden');

    // 4. Unassigned Technician CANNOT access voice recording
    const unassignedTechRes = await api(`/bookings/${targetBooking.id}/voice-recording`, {
      headers: { Authorization: `Bearer ${tokenTech1}` },
    });
    assert(unassignedTechRes.status === 403, 'Unassigned technician rejected with 403 Forbidden');

    // 5. Now assign Tech 1 to targetBooking and verify assigned technician CAN access
    await pool.query('UPDATE bookings SET technician_id = ?, booking_status = "accepted" WHERE id = ?', [tech1ProfileId, targetBooking.id]);

    const assignedTechRes = await api(`/bookings/${targetBooking.id}/voice-recording`, {
      headers: { Authorization: `Bearer ${tokenTech1}` },
    });
    assert(assignedTechRes.status === 200, 'Assigned technician can access voice recording after assignment (200 OK)');

    // 6. Path Traversal Defense: Ensure tampering with URL is blocked safely
    await pool.query('UPDATE bookings SET voice_complaint_url = "/uploads/complaints/../../../windows/win.ini" WHERE id = ?', [targetBooking.id]);
    const traversalRes = await api(`/bookings/${targetBooking.id}/voice-recording`, {
      headers: { Authorization: `Bearer ${tokenCust1}` },
    });
    assert(traversalRes.status === 403 || traversalRes.status === 404, 'Path traversal attempt rejected safely (403 or 404)');

    // Restore valid URL for cleanup
    await pool.query('UPDATE bookings SET voice_complaint_url = ? WHERE id = ?', [dbUrl, targetBooking.id]);

    // =========================================================================
    // PART 6: TECHNICIAN & CUSTOMER GET BOOKINGS ATTACHMENTS
    // =========================================================================
    console.log('\n--- Verifying Voice Data in Customer & Technician Feeds ---');

    // Customer My Bookings contains voice data
    const myBookingsRes = await api('/bookings/my-bookings', {
      headers: { Authorization: `Bearer ${tokenCust1}` },
    });
    assert(myBookingsRes.ok, 'Customer can fetch my-bookings');
    const myBooking = myBookingsRes.data.data.find((b) => b.id === targetBooking.id);
    assert(myBooking !== undefined, 'Target booking found in my-bookings');
    assert(myBooking.voice_complaint_url !== null, 'my-bookings includes voice_complaint_url');
    assert(myBooking.voice_transcription !== null, 'my-bookings includes voice_transcription');

    // Clean up temporary files
    try {
      if (fs.existsSync(testAudioPath)) fs.unlinkSync(testAudioPath);
      if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
      if (fs.existsSync(expectedDiskFile)) fs.unlinkSync(expectedDiskFile);
    } catch (_) {}

    console.log('\n==================================================');
    console.log(`🏁 Voice Complaint Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled test execution error:', err);
    process.exit(1);
  }
}

runVoiceComplaintTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
