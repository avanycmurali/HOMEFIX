# HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation

Final-Year Engineering Project

## 📌 Technology Stack
- **Frontend**: React.js, JavaScript (ES6+), HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- **Backend**: Node.js, Express.js
- **Database**: MySQL (configured for MySQL Workbench)
- **Architecture**: Modular Full-Stack Client-Server Architecture

---

## 👥 System Roles
1. **User**: Registers complaints, uploads images, gets intelligent technician recommendations, and tracks service requests.
2. **Technician**: Receives requests, views problem details, accepts/rejects, receives tool recommendations, and updates service status.
3. **Administrator**: Manages users, verifies technicians, manages services, and oversees system performance.

---

## 📂 Project Structure
```text
HOMEFIX/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MySQL connection pool
│   │   ├── controllers/
│   │   │   └── healthController.js   # Health check controller
│   │   ├── middleware/
│   │   │   └── errorHandler.js       # 404 and global error handlers
│   │   ├── routes/
│   │   │   └── healthRoutes.js       # /api/health route
│   │   └── server.js                 # Express server entry point
│   ├── uploads/                      # Directory for complaint image uploads
│   ├── .env                          # Local environment variables
│   ├── .env.example                  # Environment template
│   └── package.json                  # Backend dependencies and scripts
├── frontend/
│   ├── public/                       # Static public assets
│   ├── src/
│   │   ├── assets/                   # CSS and frontend assets
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Bootstrap 5 Navigation bar
│   │   │   └── Footer.jsx            # Project footer
│   │   ├── pages/
│   │   │   └── Home.jsx              # HOMEFIX Home page
│   │   ├── services/
│   │   │   └── api.js                # API service helper
│   │   ├── App.jsx                   # Main React component
│   │   ├── index.css                 # Global custom styles
│   │   └── main.jsx                  # React DOM entry
│   ├── index.html                    # HTML template
│   ├── vite.config.js                # Vite config with /api proxy to backend
│   └── package.json                  # Frontend dependencies and scripts
├── database/
│   └── schema.sql                    # MySQL Workbench starter script
├── .gitignore                        # Root gitignore
└── README.md                         # Project documentation
```

---

## 🚀 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/installer/) & [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)

---

### Step 1: Backend Setup
Open a terminal in the project root:

```bash
cd backend
npm install
npm run dev
```
> The backend server will start on: **http://localhost:5000**
> 
> Health check API: **http://localhost:5000/api/health**

---

### Step 2: Frontend Setup
Open a **second terminal** in the project root:

```bash
cd frontend
npm install
npm run dev
```
> The React development server will start on: **http://localhost:3000**

---

### Step 3: MySQL Database Setup (Optional for Step 1)
1. Open **MySQL Workbench**.
2. Connect to your local MySQL instance.
3. Open and run the SQL script located at: `database/schema.sql`.
4. Update `backend/.env` with your MySQL credentials (`DB_USER`, `DB_PASSWORD`, `DB_PORT`).
