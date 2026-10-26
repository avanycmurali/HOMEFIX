const fs = require('fs');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function updateCell(tcXml, text, options = {}) {
  const tcPrMatch = tcXml.match(/<w:tcPr>.*?<\/w:tcPr>/s);
  const tcPr = tcPrMatch ? tcPrMatch[0] : '';

  const fontSize = options.fontSize || 20; // 10pt
  const isBold = options.bold || false;
  const align = options.align || 'left';
  const jcXml = align !== 'left' ? `<w:jc w:val="${align}"/>` : '';
  const bXml = isBold ? '<w:b/><w:bCs/>' : '';

  if (text === null || text === undefined || text === '') {
    return `<w:tc>${tcPr}<w:p><w:pPr><w:spacing w:after="0" w:line="220" w:lineRule="auto"/>${jcXml}<w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr></w:p></w:tc>`;
  }

  const lines = String(text).split('\n');
  const runsXml = lines.map((line, idx) => {
    const escaped = escapeXml(line);
    const br = idx > 0 ? '<w:br/>' : '';
    return `${br}<w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/>${bXml}<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
  }).join('');

  return `<w:tc>${tcPr}<w:p><w:pPr><w:spacing w:after="0" w:line="220" w:lineRule="auto"/>${jcXml}<w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/>${bXml}<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/></w:rPr></w:pPr>${runsXml}</w:p></w:tc>`;
}

function updateRow(trXml, cellValues, options = {}) {
  const trPrMatch = trXml.match(/<w:trPr>.*?<\/w:trPr>/s);
  const trPr = trPrMatch ? trPrMatch[0] : '';
  const cells = trXml.match(/<w:tc[\s>].*?<\/w:tc>/gs) || [];

  const updatedCells = cells.map((cell, idx) => {
    if (idx < cellValues.length && cellValues[idx] !== undefined) {
      const val = cellValues[idx];
      const opt = Array.isArray(options.cellOpts) && options.cellOpts[idx] ? options.cellOpts[idx] : (options.defaultOpt || {});
      return updateCell(cell, val, opt);
    }
    return cell;
  });

  return `<w:tr>${trPr}${updatedCells.join('')}</w:tr>`;
}

function updateTable(tblXml, rowData) {
  const tblPrMatch = tblXml.match(/<w:tblPr>.*?<\/w:tblPr>/s);
  const tblGridMatch = tblXml.match(/<w:tblGrid>.*?<\/w:tblGrid>/s);
  const tblPr = tblPrMatch ? tblPrMatch[0] : '';
  const tblGrid = tblGridMatch ? tblGridMatch[0] : '';

  const rows = tblXml.match(/<w:tr[\s>].*?<\/w:tr>/gs) || [];
  const updatedRows = rows.map((row, rIdx) => {
    if (rowData[rIdx]) {
      const rDef = rowData[rIdx];
      return updateRow(row, rDef.values, rDef.options || {});
    }
    return row;
  });

  return `<w:tbl>${tblPr}${tblGrid}${updatedRows.join('')}</w:tbl>`;
}

let xml = fs.readFileSync('D:/projects/HOMEFIX/document_raw.xml', 'utf8');

// Match all tables
const tblMatches = xml.match(/<w:tbl[\s>].*?<\/w:tbl>/gs) || [];
console.log(`Found ${tblMatches.length} tables to update.`);

// -----------------------------------------------------------------------------
// TABLE 1: STUDENT / PROJECT DETAILS (Page 1)
// -----------------------------------------------------------------------------
const table1Data = {
  1: { values: [undefined, "Avany C Muralidharan"], options: { cellOpts: [{}, { bold: true, fontSize: 22 }] } },
  2: { values: [undefined, "A 25"], options: { cellOpts: [{}, { bold: true, fontSize: 22 }] } },
  3: { values: [undefined, "HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation"], options: { cellOpts: [{}, { bold: true, fontSize: 21 }] } },
  4: { values: [undefined, "Dr. Shahna K U"], options: { cellOpts: [{}, { bold: true, fontSize: 22 }] } },
  5: { values: [undefined, "Unassigned in project records\n(Dr. Shahna K U acts as Faculty Project Guide / Product Owner as per KTU norms)"], options: { cellOpts: [{}, { fontSize: 20 }] } },
  6: { values: [undefined, "https://github.com/avanycmurali/HOMEFIX.git"], options: { cellOpts: [{}, { fontSize: 20 }] } }
};

// -----------------------------------------------------------------------------
// TABLE 2: PROJECT OVERVIEW (Page 3)
// -----------------------------------------------------------------------------
const table2Data = {
  1: { values: [undefined, "HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation"], options: { cellOpts: [{}, { bold: true, fontSize: 21 }] } },
  2: { values: [undefined, "HOMEFIX is a full-stack web application designed to connect households with verified, reliable technicians across essential service domains (electrical, plumbing, carpentry, appliance repair, painting, and cleaning). It features a 5-factor rule-based recommendation engine that evaluates specialization, proximity via Haversine distance and pincode, availability, rating, experience, and visiting charges. The system incorporates complaint registration with photo uploads via Multer, voice input via Web Speech API, role-based dashboards for Users, Technicians, and Admin, full service lifecycle tracking, diagnostic tool/material suggestions, demo payment/payout workflows, and verified customer reviews."], options: { cellOpts: [{}, { fontSize: 19 }] } },
  3: { values: [undefined, "Web Applications / Intelligent Recommendation Systems / Service Management"], options: { cellOpts: [{}, { fontSize: 20 }] } },
  4: { values: [undefined, "• Frontend: React.js 18, Vite, JavaScript (ES6+), HTML5, CSS3, Bootstrap 5, Bootstrap Icons, React Router DOM v6\n• Backend: Node.js (ESM), Express.js, JWT (jsonwebtoken), bcryptjs, Multer\n• Database: MySQL Server / MySQL Workbench (12 Relational Tables)\n• Speech & Payment: Browser Web Speech API, Razorpay SDK (Test/Demo Mode)\n• Version Control: Git, GitHub"], options: { cellOpts: [{}, { fontSize: 19 }] } },
  5: { values: [undefined, "SDG 8 (Decent Work & Economic Growth), SDG 9 (Industry, Innovation & Infrastructure), SDG 11 (Sustainable Cities & Communities), SDG 12 (Responsible Consumption & Production)"], options: { cellOpts: [{}, { fontSize: 20 }] } },
  6: { values: [undefined, "PO1, PO2, PO3, PO4, PO5, PO6, PO7, PO8 (Detailed mapping justifications provided in Section 3)"], options: { cellOpts: [{}, { fontSize: 20 }] } }
};

// -----------------------------------------------------------------------------
// TABLE 3: SDG MAPPING JUSTIFICATION (Page 4)
// -----------------------------------------------------------------------------
const table3Data = {
  1: { values: [undefined, "SDG 8: Decent Work and Economic Growth", "Provides informal trade technicians (electricians, plumbers, carpenters) with a formal digital marketplace to access verified customer bookings, organize work schedules, establish credible professional reputations through customer ratings, and secure transparent, trackable earnings with structured payout ledgers."], options: { cellOpts: [{}, { bold: true, fontSize: 20 }, { fontSize: 19 }] } },
  2: { values: [undefined, "SDG 9: Industry, Innovation, and Infrastructure", "Modernizes the informal household maintenance sector through technological innovation by deploying an intelligent rule-based multi-criteria recommendation engine, multimodal complaint registration (image and voice inputs), and an end-to-end digital service tracking infrastructure."], options: { cellOpts: [{}, { bold: true, fontSize: 20 }, { fontSize: 19 }] } },
  3: { values: [undefined, "SDG 11: Sustainable Cities and Communities", "Enhances urban living standards and neighborhood safety by facilitating rapid, localized maintenance of essential domestic electrical, sanitary, and utility systems, preventing severe domestic hazards and promoting resilient community infrastructure."], options: { cellOpts: [{}, { bold: true, fontSize: 20 }, { fontSize: 19 }] } },
  4: { values: [undefined, "SDG 12: Responsible Consumption and Production", "Promotes sustainable domestic appliance usage by enabling timely diagnostic repair and servicing, extending the operational lifecycle of household electronics and plumbing utilities, reducing premature appliance disposal, and curbing electronic waste."], options: { cellOpts: [{}, { bold: true, fontSize: 20 }, { fontSize: 19 }] } }
};

// -----------------------------------------------------------------------------
// TABLE 4: PO MAPPING JUSTIFICATION (Page 5)
// -----------------------------------------------------------------------------
const table4Data = {
  1: { values: [undefined, undefined, "Applied core computer science and software engineering principles, relational database design (3NF schema with foreign keys), RESTful client-server architecture, and mathematical algorithms including the Haversine great-circle distance formula and weighted composite scoring."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  2: { values: [undefined, undefined, "Analyzed the fragmented domestic home service sector, identifying pain points including technician search friction, lack of transparent pricing, scheduling conflicts, and absence of service tracking, formulating formal functional requirements and state machine workflows."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  3: { values: [undefined, undefined, "Designed and implemented a modular full-stack architecture featuring 3 role portals (Customer, Technician, Admin), an intelligent 5-factor technician recommendation engine, secure authentication, and payment settlement ledger conforming to usability and safety needs."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  4: { values: [undefined, undefined, "Researched and benchmarked multi-criteria ranking parameters (location proximity, real-time availability, review ratings, experience years, visiting charges) and speech recognition inputs, validating ranking robustness through comprehensive automated test suites."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  5: { values: [undefined, undefined, "Leveraged modern development and testing tools including React 18, Vite build tooling, Node.js, Express.js, MySQL Workbench, Git version control, GitHub repository hosting, Postman API testing, and browser speech APIs to construct and evaluate the platform."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  6: { values: [undefined, undefined, "Ensured professional ethics and user privacy through bcrypt password hashing, JWT stateless authorization, transparent technician ratings without artificial manipulation, clear payment fee breakdowns, and adhering to academic integrity without claiming unbuilt AI/ML features."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  7: { values: [undefined, undefined, "Functioned effectively as an independent developer under Agile/Scrum methodology, organizing work into 5 defined sprint cycles, managing the product backlog, executing regular incremental git commits, and preparing sprint review milestones."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } },
  8: { values: [undefined, undefined, "Communicated technical design and development progress effectively through formal documentation including the Project Synopsis, detailed Scrum Book sprint records, comprehensive README technical reference, and oral/visual project demonstrations."], options: { cellOpts: [{}, {}, { fontSize: 19 }] } }
};

// -----------------------------------------------------------------------------
// TABLE 5: PRODUCT BACKLOG (Page 6)
// -----------------------------------------------------------------------------
const table5Data = {
  1: { values: [undefined, undefined, undefined, "Completed: Prepared and submitted comprehensive project synopsis covering problem definition, system architecture, role hierarchy, and rule-based recommendation methodology; approved."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  2: { values: [undefined, undefined, undefined, "Completed: Surveyed 5 research papers on on-demand home service marketplaces, multi-criteria recommendation models, and localized scheduling algorithms; identified research gaps in recommendation transparency."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  3: { values: [undefined, undefined, undefined, "Completed: Project topic 'HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation' formally approved by Project Guide Dr. Shahna K U."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  4: { values: [undefined, undefined, undefined, "Completed: Formulated functional requirements for Customer, Technician, and Admin roles; finalized booking lifecycle states, photo/voice input specifications, and ranking criteria."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  5: { values: [undefined, undefined, undefined, "Completed: Identified and structured domain data parameters: 6 core service categories, geographic reference coordinates (Bangalore/Thrissur pincodes), technician qualifications, and standard pricing models in MySQL."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  6: { values: [undefined, undefined, undefined, "Completed: Selected React.js 18 + Vite for frontend, Node.js + Express.js for backend REST APIs, MySQL for relational persistence, bcryptjs/JWT for security, and Git for version control."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  7: { values: [undefined, undefined, undefined, "Completed: Partitioned application into 5 core modules: 1. Registration & Auth, 2. Complaint & Service Booking, 3. Intelligent Technician Recommendation, 4. Payment & Service Management, 5. Admin & Service History."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  8: { values: [undefined, undefined, undefined, "Completed: Designed responsive UI mockups and layouts with Bootstrap 5: Navigation bar, Home page, Registration/Login views, and initial Complaint Booking form layout."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  9: { values: [undefined, undefined, undefined, "Completed: Implemented Module 1 (Auth with JWT & bcrypt), Module 2 (Booking creation with Multer image upload), Module 3 (5-factor rule-based recommendation engine), and initial Module 4 service lifecycle transitions."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  10: { values: [undefined, undefined, undefined, "Completed: Integrated React frontend with Express REST endpoints; developed and executed backend automated test suites for Auth (15 assertions) and Bookings (17 assertions); verified lifecycle status transitions."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  11: { values: [undefined, undefined, undefined, "Completed: Refined recommendation weights, added Web Speech API complaint voice recording, implemented Razorpay Test/Demo payment flow, technician payout ledger, and diagnostic tool/material suggestions."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  12: { values: [undefined, undefined, undefined, "Completed: Conducted end-to-end multi-role live demonstration covering Customer booking -> Intelligent Recommendation -> Technician acceptance -> Progress update -> Payment & 1-5 Star Review -> Admin oversight."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  13: { values: [undefined, undefined, undefined, "Completed: Documented full codebase in README.md, completed Scrum Book records with actual git and test evidence, compiled study guide and draft project report."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } },
  14: { values: [undefined, undefined, undefined, "To Do: Ready for final project presentation, demonstration, and evaluation before the Project Assessment Board (PAB)."], options: { cellOpts: [{}, {}, {}, { fontSize: 18 }] } }
};

// -----------------------------------------------------------------------------
// TABLE 6: SPRINT REVIEW 1 (Page 7)
// -----------------------------------------------------------------------------
const table6Data = {
  1: { values: [undefined, undefined, "HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation", "Completed"], options: { cellOpts: [{}, {}, { bold: true, fontSize: 20 }, { bold: true, fontSize: 20, align: 'center' }] } },
  2: { values: [undefined, undefined, "Addresses difficulties faced by urban households in finding verified, skilled local technicians (electricians, plumbers, carpenters) while offering informal workers a digital platform for steady bookings, fair pay, and reputation building.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  3: { values: [undefined, undefined, "Surveyed 5 academic papers focusing on online home service platforms, multi-criteria decision making, and localized scheduling algorithms; synthesized findings on rule-based filtering and distance proximity calculations.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  4: { values: [undefined, undefined, "Prepared detailed project synopsis documenting problem statement, objectives, three-role architecture, 5-module structure, and rule-based recommendation criteria; submitted to Project Guide Dr. Shahna K U on schedule.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } }
};

// -----------------------------------------------------------------------------
// TABLE 7: SPRINT REVIEW 2 (Page 8)
// -----------------------------------------------------------------------------
const table7Data = {
  1: { values: [undefined, undefined, "HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation", "Completed"], options: { cellOpts: [{}, {}, { bold: true, fontSize: 20 }, { bold: true, fontSize: 20, align: 'center' }] } },
  2: { values: [undefined, undefined, "Traditional home services rely on informal contacts or unverified static directories lacking real-time availability checks, objective technician scoring, transparent cost estimates, and digital service history tracking.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  3: { values: [undefined, undefined, "A full-stack web platform providing verified technician discovery, an intelligent rule-based multi-criteria recommendation engine (evaluating proximity, availability, ratings, experience, charges), multimodal complaint logging (photo/voice), and end-to-end service lifecycle management.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  4: { values: [undefined, undefined, "Frontend: React.js 18 with Vite, JavaScript (ES6+), Bootstrap 5;\nBackend: Node.js, Express.js REST API;\nSecurity: bcryptjs password hashing, JWT authorization;\nDatabase: MySQL Server / MySQL Workbench;\nVersion Control: Git/GitHub.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  5: { values: [undefined, undefined, "Identified and established domain dataset schemas: 6 core service categories (Electrical, Plumbing, Carpentry, AC/Appliance, Painting, Cleaning), pincode coordinate mapping, technician profile attributes, and standard pricing baseline.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } }
};

// -----------------------------------------------------------------------------
// TABLE 8: SPRINT REVIEW 3 (Page 9)
// -----------------------------------------------------------------------------
const table8Data = {
  1: { values: [undefined, undefined, "Finalized 5 core functional modules:\n1. Registration & Authentication\n2. Complaint & Service Booking\n3. Intelligent Technician Recommendation\n4. Payment & Service Management\n5. Admin & Service History", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  2: { values: [undefined, undefined, "Initialized Express server, configured MySQL database connection pool (config/db.js), implemented server health check endpoint (/api/health), and created initial database tables (users, services, bookings).", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  3: { values: [undefined, undefined, "Designed core responsive pages in React: Home landing page (Home.jsx), responsive Navbar with authentication state (Navbar.jsx), Footer, and initial page wireframes using Bootstrap 5 and Bootstrap Icons.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  4: { values: [undefined, undefined, "Created GitHub repository 'avanycmurali/HOMEFIX', configured folder structure (backend, frontend, database), added .gitignore, and pushed initial project commit f1486cb on 2026-09-09.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } }
};

// TABLE 9: PAB 1 (Page 10) -> MUST REMAIN COMPLETELY BLANK! (untouched)

// -----------------------------------------------------------------------------
// TABLE 10: SPRINT REVIEW 4 (Page 11)
// -----------------------------------------------------------------------------
const table10Data = {
  1: { values: [undefined, undefined, "• Module 1: Built Customer & Technician registration, multi-portal login, bcrypt password hashing, and JWT token issuance with role-based route middleware.\n• Module 2: Developed complaint booking form with Multer photo upload, time slot scheduling, and database persistence.\n• Module 3: Implemented rule-based recommendation algorithm evaluating 5 weighted factors (Location 30%, Availability 20%, Rating 20%, Experience 15%, Charges 15%) and Haversine distance.\n• Module 4: Implemented core service lifecycle state machine (pending -> technician_assigned -> customer_selected_technician -> accepted -> in_progress -> completed).", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 18 }, { bold: true, fontSize: 20, align: 'center' }] } },
  2: { values: [undefined, undefined, "Connected React frontend forms to backend REST endpoints; implemented AuthContext for global session management; verified role authorization middleware; resolved cross-origin proxy configuration in Vite.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  3: { values: [undefined, undefined, "Created automated Node.js test scripts for backend validation (testAuth.js, testBookings.js, testCustomerTechnicianSelection.js, testTechnicianServiceLifecycle.js); verified response codes, status updates, and error handling for invalid payloads.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  4: { values: [undefined, undefined, "Committed and pushed major feature milestones: Commit 9923dc1 ('Complete authentication and booking module updates' on 2026-09-14) and Commit 24ab743 ('completed module 1-3 and service lifecycle' on 2026-09-23).", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } }
};

// -----------------------------------------------------------------------------
// TABLE 11: SPRINT REVIEW 5 (Page 12)
// -----------------------------------------------------------------------------
const table11Data = {
  1: { values: [undefined, undefined, "Demonstrated full end-to-end multi-role live workflow: Customer registers complaint with image/voice -> System ranks technicians -> Customer selects technician -> Technician accepts & updates progress -> Demo payment processed -> Customer submits 1-5 star review -> Admin dashboard displays KPI stats, verifies technicians, and manages payouts.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 18 }, { bold: true, fontSize: 20, align: 'center' }] } },
  2: { values: [undefined, undefined, "All 5 module test suites executed and verified with 100% pass rate: Module 1 (14/14 tests), Module 2 (104/104 tests), Module 3 (56/56 tests), Module 4 (178/178 tests), Module 5 (36/36 tests); total 388 test assertions verified across all test scripts.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 18 }, { bold: true, fontSize: 20, align: 'center' }] } },
  3: { values: [undefined, undefined, "• Current Limitations: Payment gateway operates in Test/Demo mode (PAYMENT_MODE=demo) without live merchant KYC; Repair vs. Replace Advisor is a planned conceptual extension and not implemented; automated scheduled maintenance reminders (table maintenance_reminders) are unlinked to active workflows; Browser Web Speech API requires browser speech engine support.\n• Future Enhancements: Live UPI/Card gateway with production webhooks; AI/ML predictive dynamic pricing and fault diagnosis; automated SMS/WhatsApp alerts; mobile native apps.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 18 }, { bold: true, fontSize: 20, align: 'center' }] } },
  4: { values: [undefined, undefined, "Scrum Book systematically updated with all sprint activities, backlog items, real Git commits, and test cases; literature survey and recommendation methodology compiled for study guide and academic documentation.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } },
  5: { values: [undefined, undefined, "Completed README technical reference, system architectural diagrams, database schema documentation, and finalized draft project report ready for final PAB evaluation.", "Completed"], options: { cellOpts: [{}, {}, { fontSize: 19 }, { bold: true, fontSize: 20, align: 'center' }] } }
};

// TABLE 12: PAB 2 (Page 13) -> MUST REMAIN COMPLETELY BLANK! (untouched)

// -----------------------------------------------------------------------------
// TABLE 13: TESTING AND VALIDATION (Page 15)
// -----------------------------------------------------------------------------
const table13Data = {
  1: { values: ["1", "User Authentication & Role Verification (Module 1)", "POST /api/auth/login with valid customer credentials:\n{\"email\":\"user@homefix.com\", \"password\":\"User@123\"}", "HTTP 200 OK, valid JWT bearer token generated, user object returned with role 'user', access granted to protected routes.", "HTTP 200 OK, JWT bearer token generated with 24-hour expiration, user role verified as 'user', login successful.", "Pass"], options: { cellOpts: [{ align: 'center' }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { bold: true, align: 'center' }] } },
  2: { values: ["2", "Complaint Registration with Image Upload (Module 2)", "POST /api/bookings (multipart/form-data) with service_id: 1, title: 'Ceiling fan sparking', description: 'Sparking from regulator', image file attachment (fan.jpg), schedule date & slot.", "HTTP 201 Created, unique booking reference (e.g. BK-...) generated, image file stored in /uploads/complaints/, status initialized to 'pending'.", "HTTP 201 Created, unique reference generated, file saved successfully, booking record persisted with status 'pending'.", "Pass"], options: { cellOpts: [{ align: 'center' }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { bold: true, align: 'center' }] } },
  3: { values: ["3", "Intelligent Technician Recommendation Engine (Module 3)", "GET /api/bookings/:id/recommendations for electrical complaint in Bangalore (pincode 560034).", "HTTP 200 OK, returns filtered verified electricians ranked by composite match score (Location 30%, Availability 20%, Rating 20%, Experience 15%, Charges 15%).", "HTTP 200 OK, eligible technicians ranked; top technician receives 96/100 score with detailed breakdown JSON; lower scores assigned to distant/busy technicians.", "Pass"], options: { cellOpts: [{ align: 'center' }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { bold: true, align: 'center' }] } },
  4: { values: ["4", "Service Progress, Demo Payment & Review (Modules 4 & 5)", "Technician accepts booking, marks in_progress -> completed; Customer initiates Demo payment POST /api/bookings/:id/payment/order and submits 5-star review.", "HTTP 200 OK, lifecycle status updated, payment recorded as 'paid', payout split recorded (85% tech, 15% platform), review saved.", "HTTP 200 OK, status transitions logged in service_status_logs, payment record updated to 'paid', payout ledger generated, review recorded.", "Pass"], options: { cellOpts: [{ align: 'center' }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { fontSize: 18 }, { bold: true, align: 'center' }] } }
};

// -----------------------------------------------------------------------------
// TABLE 14: GITHUB / VERSION HISTORY (Page 16)
// -----------------------------------------------------------------------------
const table14Data = {
  1: { values: ["2026-09-09", "v0.1.0-alpha", "f1486cb", "Initial workspace setup; React Vite frontend boilerplate, Express server, MySQL database connection pool, initial schema.sql, root .gitignore, README.md."], options: { cellOpts: [{ align: 'center', fontSize: 19 }, { align: 'center', fontSize: 19 }, { align: 'center', bold: true, fontSize: 19 }, { fontSize: 18 }] } },
  2: { values: ["2026-09-14", "v0.2.0-beta", "9923dc1", "Modules 1 & 2: User/Technician registration and login with bcrypt & JWT, AuthContext, complaint booking with Multer photo upload, MyBookings, testAuth.js, testBookings.js."], options: { cellOpts: [{ align: 'center', fontSize: 19 }, { align: 'center', fontSize: 19 }, { align: 'center', bold: true, fontSize: 19 }, { fontSize: 18 }] } },
  3: { values: ["2026-09-23", "v0.3.0", "24ab743", "Modules 3 & 4: Intelligent Technician Recommendation Engine (5 weighted criteria, Haversine formula), technician recommendation card UI, service lifecycle state transitions, testCustomerTechnicianSelection.js."], options: { cellOpts: [{ align: 'center', fontSize: 19 }, { align: 'center', fontSize: 19 }, { align: 'center', bold: true, fontSize: 19 }, { fontSize: 18 }] } },
  4: { values: ["2026-10-26", "v1.0.0", "bcaab6e", "Modules 4 & 5 completion: Razorpay & Demo payment gateway, technician payouts ledger, diagnostic tool/material suggestions engine, voice complaint capture, admin dashboard KPIs, audit logs, reviews, comprehensive test suites."], options: { cellOpts: [{ align: 'center', fontSize: 19 }, { align: 'center', fontSize: 19 }, { align: 'center', bold: true, fontSize: 19 }, { fontSize: 18 }] } },
  5: { values: ["-", "-", "-", "(No further commits; repository reflects complete project release)"], options: { cellOpts: [{ align: 'center' }, { align: 'center' }, { align: 'center' }, { fontSize: 18 }] } },
  6: { values: ["-", "-", "-", "-"], options: { cellOpts: [{ align: 'center' }, { align: 'center' }, { align: 'center' }, { align: 'center' }] } },
  7: { values: ["-", "-", "-", "-"], options: { cellOpts: [{ align: 'center' }, { align: 'center' }, { align: 'center' }, { align: 'center' }] } },
  8: { values: ["-", "-", "-", "-"], options: { cellOpts: [{ align: 'center' }, { align: 'center' }, { align: 'center' }, { align: 'center' }] } }
};

// -----------------------------------------------------------------------------
// TABLE 15: FINAL CHECKLIST (Page 17)
// -----------------------------------------------------------------------------
const table15Data = {
  1: { values: [undefined, "Yes", "All 5 core modules (Auth, Booking, Recommendation, Payment/Lifecycle, Admin/History) fully implemented and verified."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } },
  2: { values: [undefined, "Yes", "388 automated test assertions executed across all 5 modules with 100% pass rate."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } },
  3: { values: [undefined, "Yes", "Repository up-to-date on main branch (bcaab6e) at https://github.com/avanycmurali/HOMEFIX.git."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } },
  4: { values: [undefined, "Yes", "Scrum Book systematically documented across all sprints reflecting actual project implementation."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } },
  5: { values: [undefined, "In Progress", "Research paper draft on rule-based multi-criteria technician recommendation in progress for submission."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } },
  6: { values: [undefined, "Yes", "Comprehensive project report and study guide compiled and prepared for final evaluation."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } },
  7: { values: [undefined, "Yes", "Multi-role end-to-end live demonstration configured and verified across Customer, Technician, and Admin portals."], options: { cellOpts: [{}, { bold: true, align: 'center' }, { fontSize: 19 }] } }
};

// -----------------------------------------------------------------------------
// TABLE 16: SIGNATURES (Page 17)
// -----------------------------------------------------------------------------
const table16Data = {
  1: { values: [undefined, "Dr. Shahna K U", "", ""], options: { cellOpts: [{}, { bold: true, fontSize: 20 }, {}, {}] } },
  2: { values: [undefined, "", "", ""], options: { cellOpts: [{}, {}, {}, {}] } }
};

// Mapping tables to their data definitions
const allTablesData = [
  table1Data,   // 1
  table2Data,   // 2
  table3Data,   // 3
  table4Data,   // 4
  table5Data,   // 5
  table6Data,   // 6
  table7Data,   // 7
  table8Data,   // 8
  null,         // 9: PAB 1 (untouched)
  table10Data,  // 10
  table11Data,  // 11
  null,         // 12: PAB 2 (untouched)
  table13Data,  // 13
  table14Data,  // 14
  table15Data,  // 15
  table16Data   // 16
];

// Perform table replacements
tblMatches.forEach((oldTbl, idx) => {
  const data = allTablesData[idx];
  if (data) {
    console.log(`Updating Table ${idx + 1}...`);
    const newTbl = updateTable(oldTbl, data);
    xml = xml.replace(oldTbl, newTbl);
  } else {
    console.log(`Skipping Table ${idx + 1} (Intentionally kept blank / untouched).`);
  }
});

// -----------------------------------------------------------------------------
// SECTION: DATABASE AND USER INTERFACE DESIGN (Page 14)
// -----------------------------------------------------------------------------
const dbSectionHeading = 'DATABASE AND USER INTERFACE DESIGN';
const dbSectionGuideSig = "Guide's Name &amp; Signature:";

// Find the section between the instruction paragraph and Guide's Name & Signature on Page 14
const dbStartIdx = xml.indexOf(dbSectionHeading);
const dbInstructionIdx = xml.indexOf('Attach or paste ER diagrams', dbStartIdx);
const dbInstructionEnd = xml.indexOf('</w:p>', dbInstructionIdx) + 6;

// Find Guide's Name & Signature right after that
const dbGuideSigIdx = xml.indexOf("Guide's Name &amp; Signature:", dbInstructionEnd);

// Rich content for Page 14: Database & UI Design
const dbUiContentXml = `
<w:p><w:pPr><w:spacing w:before="60" w:after="40" w:line="220" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>1. Relational Database Schema Architecture (MySQL - homefix database)</w:t></w:r></w:p>
<w:p><w:pPr><w:spacing w:after="40" w:line="210" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t xml:space="preserve">The HOMEFIX persistence layer comprises 12 normalized relational tables designed in MySQL Workbench (InnoDB engine, utf8mb4):
• users: Stores system credentials, phone, address, city, pincode, bcrypt password hash, and role (user, technician, admin).
• services: Service catalog (Electrical, Plumbing, Carpentry, AC/Appliance, Painting, Cleaning) with base price and icon metadata.
• technician_profiles: 1-to-1 extension of users storing specialization (service_id), experience, hourly/visiting fees, geographic coordinates, rating, availability status (available, busy, offline), and admin verification status (pending, verified, rejected).
• bookings: Central complaint/service entity capturing booking_reference, problem title/description, photo URL (Multer), voice URL, schedule slot, status machine, and estimated/final costs.
• technician_recommendations: Stores rule-based match scores (0-100), rank positions, and criteria score breakdown JSON.
• payments &amp; technician_payouts: Billing transactions (Demo/Razorpay) and settlement ledger (85% technician net, 15% platform commission).
• service_status_logs &amp; tool_material_suggestions: Status audit trail and diagnostic suggestions mapped to problem keywords.
• reviews &amp; admin_logs: 1-to-5 star verified reviews and administrative operation audit trail.</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:before="60" w:after="40" w:line="220" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>2. Entity-Relationship &amp; Data Flow Dependencies</w:t></w:r></w:p>
<w:p><w:pPr><w:spacing w:after="40" w:line="210" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t xml:space="preserve">• users (1) ───&lt; bookings (M) [ON DELETE CASCADE]
• technician_profiles (1) ───&lt; bookings (M) [ON DELETE SET NULL]
• services (1) ───&lt; bookings (M) [ON DELETE RESTRICT]
• bookings (1) ───&lt; technician_recommendations (M) [ON DELETE CASCADE]
• bookings (1) ─── (1) payments (1) ─── (1) technician_payouts [ON DELETE CASCADE]
• bookings (1) ─── (1) reviews [rating TINYINT CHECK (rating BETWEEN 1 AND 5)]
• bookings (1) ───&lt; service_status_logs (M) [Complete status lifecycle audit]</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:before="60" w:after="40" w:line="220" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>3. User Interface Design &amp; Role-Based Screen Navigation</w:t></w:r></w:p>
<w:p><w:pPr><w:spacing w:after="40" w:line="210" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t xml:space="preserve">• Customer Portal: Home landing page (Home.jsx) with service discovery; Multi-step complaint registration (BookService.jsx) supporting photo attachment and voice input recording via Web Speech API; Tracking dashboard (MyBookings.jsx) showing real-time status badges, technician match cards, Test/Demo payment modal, and post-service review dialog.
• Technician Portal: Dedicated workspace (Dashboard.jsx) with live availability toggle (Available/Busy/Offline), assigned booking queue, accept/reject modal with reason logging, progress update controls (Start Service / Complete Service), tool and material suggestion viewer, and earnings ledger.
• Administrator Portal: Executive overview featuring KPI summary cards (Total Bookings, Active Users, Verified Technicians, Gross Revenue, Platform Commission), technician verification review queue (Approve/Reject), customer directory, technician settlement ledger, and system audit logs.</w:t></w:r></w:p>

<w:p><w:pPr><w:spacing w:before="60" w:after="40" w:line="220" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:color w:val="1F4E79"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>4. Project Design Artifacts &amp; Screen Screenshots</w:t></w:r></w:p>
<w:p><w:pPr><w:spacing w:after="40" w:line="210" w:lineRule="auto"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:i/><w:color w:val="595959"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">[Note: In accordance with project rough record guidelines, the student may attach or paste the MySQL Workbench ER Diagram export and live screen captures of the Complaint Booking form, Technician Recommendation Card, Technician Queue, and Admin Dashboard in the designated space below.]</w:t></w:r></w:p>
`;

xml = xml.substring(0, dbInstructionEnd) + dbUiContentXml + xml.substring(dbGuideSigIdx);

// -----------------------------------------------------------------------------
// UPDATE GITHUB REPOSITORY URL PARAGRAPH (Page 16)
// -----------------------------------------------------------------------------
const ghUrlMarker = 'GitHub Repository URL';
const ghUrlIdx = xml.indexOf(ghUrlMarker);
if (ghUrlIdx !== -1) {
  const pStart = xml.lastIndexOf('<w:p ', ghUrlIdx);
  const pEnd = xml.indexOf('</w:p>', ghUrlIdx) + 6;
  const newGhP = `<w:p><w:pPr><w:spacing w:before="80" w:after="80"/><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">GitHub Repository URL: </w:t></w:r><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:color w:val="0563C1"/><w:u w:val="single"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>https://github.com/avanycmurali/HOMEFIX.git</w:t></w:r></w:p>`;
  xml = xml.substring(0, pStart) + newGhP + xml.substring(pEnd);
}

// -----------------------------------------------------------------------------
// WRITE OUTPUT XML
// -----------------------------------------------------------------------------
fs.writeFileSync('D:/projects/HOMEFIX/document_filled.xml', xml, 'utf8');
console.log('Successfully generated document_filled.xml! Length:', xml.length);
