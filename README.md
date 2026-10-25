# HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation

Final-Year Engineering Project

## 📌 Technology Stack
- **Frontend**: React.js 18, JavaScript (ES6+), HTML5, CSS3, Bootstrap 5, Bootstrap Icons, React Router DOM v6
- **Backend**: Node.js (ESM), Express.js, bcryptjs, jsonwebtoken, multer
- **Database**: MySQL (configured for MySQL Workbench)
- **Architecture**: Modular Full-Stack Client-Server Architecture

---

## 👥 System Roles
1. **User (Customer)**: Registers complaints with photos, selects service category, schedules visits, tracks repair status, and cancels bookings.
2. **Technician**: Views assigned complaints, checks tool recommendations, and updates service progress.
3. **Administrator**: Manages users, verifies technicians, manages services, and oversees all bookings.

---

## ✅ Module Implementation Status

| Module | Description | Backend | Frontend | Status |
|--------|-------------|---------|----------|:------:|
| **Module 1** | Registration & Authentication (Role-based JWT & Bcrypt) | ✅ Done (14/14 tests) | ✅ Done | **Completed** |
| **Module 2** | Complaint Registration & Service Booking (Photos & Voice) | ✅ Done (104/104 tests) | ✅ Done | **Completed** |
| **Module 3** | Intelligent Technician Recommendation & Selection | ✅ Done (56/56 tests) | ✅ Done | **Completed** |
| **Module 4** | Service Progress, Tool Recommendations & Payments | ✅ Done (178/178 tests) | ✅ Done | **Completed** |
| **Module 5** | Admin Oversight, Service History & Reviews | ✅ Done (36/36 tests) | ✅ Done | **Completed** |

> ℹ️ **Payment Gateway Note**: Payments and Razorpay integration are currently configured and running in **Test/Demo mode** (`PAYMENT_MODE=demo`). This supports complete offline and test evaluation with simulated UPI, Card, Net Banking, and Cash-on-Service workflows without requiring active merchant KYC approval.
>
> ℹ️ **Maintenance Reminders Note**: Automated scheduled maintenance reminders (table `maintenance_reminders` present in the database schema) are **optional / not implemented** in the active application workflow and do not impact core booking, recommendation, service tracking, payments, or review functionality.

---

## 📂 Project Structure
```text
HOMEFIX/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # MySQL connection pool
│   │   ├── controllers/
│   │   │   ├── healthController.js      # Health check controller
│   │   │   ├── authController.js        # Register, Login, GetMe, Password reset
│   │   │   ├── servicesController.js    # Service categories
│   │   │   ├── bookingController.js     # Complaints, bookings, voice & reviews
│   │   │   ├── paymentController.js     # Razorpay & Demo payments
│   │   │   ├── payoutController.js      # Technician earnings & platform commission
│   │   │   └── adminController.js       # Admin overview, user & technician management
│   │   ├── services/
│   │   │   ├── recommendationEngine.js  # Intelligent multi-criteria recommendation algorithm
│   │   │   ├── toolMaterialRecommendationEngine.js # Tool & material diagnostic engine
│   │   │   └── razorpayService.js       # Razorpay order & HMAC verification
│   │   ├── utils/
│   │   │   ├── complaintDetectionEngine.js # Multimodal keyword & STT detection engine
│   │   │   └── jwt.js                   # JWT token creation and verification
│   │   ├── middleware/
│   │   │   ├── errorHandler.js          # 404 and global error handlers
│   │   │   ├── authMiddleware.js        # JWT verifyToken + authorizeRoles
│   │   │   └── uploadMiddleware.js      # multer for complaint photos & voice audio
│   │   ├── routes/
│   │   │   ├── healthRoutes.js          # GET /api/health
│   │   │   ├── authRoutes.js            # POST /api/auth/*
│   │   │   ├── serviceRoutes.js         # GET /api/services
│   │   │   ├── bookingRoutes.js         # POST/GET/PUT /api/bookings/*
│   │   │   ├── technicianRoutes.js       # GET /api/technician/*
│   │   │   └── adminRoutes.js           # GET/PUT /api/admin/*
│   │   ├── scripts/
│   │   │   ├── seedPasswords.js         # Seed bcrypt hashes for demo accounts
│   │   │   ├── migrateStatusEnums.js    # Migration for lifecycle statuses
│   │   │   ├── migrateResetPassword.js  # Migration for password reset tokens
│   │   │   ├── migrateRazorpayPayments.js # Migration for payment records
│   │   │   ├── migrateTechnicianPayouts.js # Migration for technician settlement payouts
│   │   │   ├── migrateVoiceComplaints.js # Migration for voice complaint audio
│   │   │   ├── testAuth.js              # Module 1 automated test suite
│   │   │   ├── testBookings.js          # Module 2 automated test suite
│   │   │   ├── testCustomerTechnicianSelection.js # Module 3 recommendation test suite
│   │   │   ├── testTechnicianServiceLifecycle.js # Module 4 service progress test suite
│   │   │   ├── testRazorpayPayments.js  # Module 4 payment test suite
│   │   │   ├── testTechnicianPayouts.js # Module 4 payout commission test suite
│   │   │   ├── testAdminAndHistory.js   # Module 5 admin & reviews test suite
│   │   │   └── testVoiceComplaints.js   # Multimodal voice complaint test suite
│   │   └── server.js                    # Express server entry point
│   ├── uploads/
│   │   └── complaints/                  # Uploaded complaint images & voice recordings
│   ├── .env                             # Local environment variables
│   ├── .env.example                     # Environment template
│   └── package.json                     # Backend dependencies and scripts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Navigation (auth & role-aware)
│   │   │   ├── Footer.jsx               # Project footer
│   │   │   ├── TechnicianRecommendationCard.jsx # Match score card & selection
│   │   │   ├── StatusBadge.jsx          # Color-coded lifecycle badge
│   │   │   ├── LoadingSkeleton.jsx      # Skeleton loader placeholders
│   │   │   └── EmptyState.jsx           # Clean empty state UI component
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Global auth state + login/register actions
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # HOMEFIX Home page
│   │   │   ├── Login.jsx                # Multi-role login (User/Tech/Admin portals)
│   │   │   ├── Register.jsx             # Customer & Technician registration
│   │   │   ├── ForgotPassword.jsx       # Password reset request
│   │   │   ├── ResetPassword.jsx        # Token-based password update
│   │   │   ├── Dashboard.jsx            # Role-based workspace (Customer, Tech & Admin)
│   │   │   ├── BookService.jsx          # Register complaint with photo, voice & schedule
│   │   │   └── MyBookings.jsx           # Tracking, tech selection, payments & reviews
│   │   ├── services/
│   │   │   └── api.js                   # All HTTP API functions
│   │   ├── utils/
│   │   │   └── complaintDetection.js    # Client-side smart complaint category detector
│   │   ├── App.jsx                      # Main routes and providers
│   │   ├── index.css                    # Global custom styles
│   │   └── main.jsx                     # React DOM entry
│   ├── index.html                       # HTML template
│   ├── vite.config.js                   # Vite config with /api proxy to backend
│   └── package.json                     # Frontend dependencies and scripts
├── database/
│   └── schema.sql                       # MySQL Workbench complete schema (all 5 modules)
├── .gitignore                           # Root gitignore
└── README.md                            # Project documentation
```

---

## 🚀 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/installer/) & [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)

---

### Step 1: Database Setup
1. Open **MySQL Workbench** and connect to your local MySQL instance.
2. Open and run: `database/schema.sql` — this creates the `homefix` database and seeds demo data.
3. Update `backend/.env` with your MySQL credentials.

---

### Step 2: Backend Setup
```bash
cd backend
npm install
node src/scripts/seedPasswords.js    # Activate bcrypt hashes for demo accounts (run once)
npm run dev
```
> Backend runs on: **http://localhost:5000**

---

### Step 3: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs on: **http://localhost:3000**

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Portal URL |
|------|-------|----------|------------|
| **Customer** | `user@homefix.com` | `User@123` | `/login` |
| **Technician** | `tech.electric@homefix.com` | `Tech@123` | `/login?role=technician` |
| **Admin** | `admin@homefix.com` | `Admin@123` | `/login?role=admin` |

---

## 🌐 Key Application Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Home & System Status | Public |
| `/register` | Customer & Technician registration | Public |
| `/login` | Multi-role login portals | Public |
| `/dashboard` | Role-based workspace | Authenticated |
| `/book-service` | Register new complaint/booking | Customer |
| `/my-bookings` | Track complaints & cancel bookings | Customer |

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Server & DB health check | Public |
| GET | `/api/services` | All active service categories | Public |
| POST | `/api/auth/register` | Customer registration | Public |
| POST | `/api/auth/register-technician` | Technician registration | Public |
| POST | `/api/auth/login` | Login (all roles) | Public |
| GET | `/api/auth/me` | Current user profile | JWT |
| POST | `/api/bookings` | Create complaint + photo upload | Customer |
| GET | `/api/bookings/my-bookings` | Customer's complaint history | Customer |
| GET | `/api/bookings/technician` | Technician's service queue | Technician |
| GET | `/api/bookings` | All bookings | Admin |
| GET | `/api/bookings/:id` | Booking details + status log | JWT |
| PUT | `/api/bookings/:id/cancel` | Cancel a complaint | Customer/Admin |
| GET | `/api/bookings/:id/recommendations` | Top recommended technicians with match scores | JWT |
| PUT | `/api/bookings/:id/select-technician` | Customer selects a recommended technician | Customer |
| GET | `/api/bookings/technician/requests` | Technician pending customer service requests | Technician |
| PUT | `/api/bookings/:id/accept` | Accept a service booking | Technician |
| PUT | `/api/bookings/:id/reject` | Reject booking with reason | Technician |
| PUT | `/api/bookings/:id/start` | Start service (status -> in_progress) | Technician |
| PUT | `/api/bookings/:id/complete` | Complete service & record notes | Technician |
| GET | `/api/bookings/:id/tool-material-suggestions` | Tool & material suggestions for diagnosis | Technician |
| POST | `/api/bookings/:id/payment/order` | Create payment order (Demo/Razorpay) | Customer |
| POST | `/api/bookings/:id/payment/verify` | Verify payment & update settlement | Customer |
| GET | `/api/bookings/:id/payment` | Get payment status & receipt | Customer/Admin |
| GET | `/api/technician/earnings` | Technician payouts & earnings ledger | Technician |
| POST | `/api/bookings/:id/review` | Submit 1–5 star rating & feedback | Customer |
| GET | `/api/bookings/:id/review` | Get review details for booking | JWT |
| GET | `/api/admin/dashboard-stats` | System KPI statistics & platform totals | Admin |
| GET | `/api/admin/customers` | Customer list & account status | Admin |
| GET | `/api/admin/technicians` | Technician list & verification queue | Admin |
| PUT | `/api/admin/technicians/:id/verify` | Approve or reject technician profile | Admin |
| GET | `/api/admin/payouts` | Payout settlement records & platform fees | Admin |
| PUT | `/api/admin/payouts/:id/mark-paid` | Settle technician payout | Admin |
| GET | `/api/admin/reviews` | Global reviews & ratings ledger | Admin |
| GET | `/api/admin/audit-logs` | Administrative operation audit logs | Admin |
