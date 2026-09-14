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

| Module | Description | Backend | Frontend |
|--------|-------------|---------|----------|
| **Module 1** | Registration & Authentication | ✅ Done (14/14 tests) | ✅ Done |
| **Module 2** | Complaint Registration & Service Booking | ✅ Done (16/16 tests) | ✅ Done |
| **Module 3** | Intelligent Technician Recommendation | 🔲 Upcoming | 🔲 Upcoming |
| **Module 4** | Payment & Service Management | 🔲 Upcoming | 🔲 Upcoming |
| **Module 5** | Admin & Service History | 🔲 Upcoming | 🔲 Upcoming |

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
│   │   │   ├── authController.js        # Register, Login, GetMe
│   │   │   ├── servicesController.js    # Service categories
│   │   │   └── bookingController.js     # Complaints & bookings
│   │   ├── middleware/
│   │   │   ├── errorHandler.js          # 404 and global error handlers
│   │   │   ├── authMiddleware.js        # JWT verifyToken + authorizeRoles
│   │   │   └── uploadMiddleware.js      # multer for complaint photos
│   │   ├── routes/
│   │   │   ├── healthRoutes.js          # GET /api/health
│   │   │   ├── authRoutes.js            # POST /api/auth/*
│   │   │   ├── serviceRoutes.js         # GET /api/services
│   │   │   └── bookingRoutes.js         # POST/GET/PUT /api/bookings/*
│   │   ├── scripts/
│   │   │   ├── seedPasswords.js         # Seed bcrypt hashes for demo accounts
│   │   │   ├── testAuth.js              # Module 1 automated test suite
│   │   │   └── testBookings.js          # Module 2 automated test suite
│   │   └── server.js                    # Express server entry point
│   ├── uploads/
│   │   └── complaints/                  # Uploaded complaint images stored here
│   ├── .env                             # Local environment variables
│   ├── .env.example                     # Environment template
│   └── package.json                     # Backend dependencies and scripts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Bootstrap 5 Navigation (auth-aware)
│   │   │   └── Footer.jsx               # Project footer
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Global auth state + login/register actions
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # HOMEFIX Home page
│   │   │   ├── Login.jsx                # Multi-role login (User/Tech/Admin portals)
│   │   │   ├── Register.jsx             # Customer & Technician registration
│   │   │   ├── Dashboard.jsx            # Role-based user dashboard
│   │   │   ├── BookService.jsx          # Register complaint with photo & schedule
│   │   │   └── MyBookings.jsx           # Customer complaint tracking & cancellation
│   │   ├── services/
│   │   │   └── api.js                   # All HTTP API functions
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
