-- =============================================================================
-- HOMEFIX — Smart Home Service Booking System with Intelligent Technician Recommendation
-- COMPLETE DATABASE SCHEMA SCRIPT (All 5 Modules)
-- Designed for MySQL Workbench / MySQL Server
-- =============================================================================

CREATE DATABASE IF NOT EXISTS homefix;
USE homefix;

-- Temporarily disable foreign key checks for safe re-runs
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS maintenance_reminders;
DROP TABLE IF EXISTS tool_material_suggestions;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS service_status_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS technician_recommendations;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS technician_profiles;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- MODULE 1: REGISTRATION & AUTHENTICATION
-- =============================================================================

-- Table: users
-- Stores all accounts (Users/Customers, Technicians, Administrators)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('user', 'technician', 'admin') NOT NULL DEFAULT 'user',
    address TEXT NULL,
    city VARCHAR(50) NULL,
    pincode VARCHAR(10) NULL,
    profile_image VARCHAR(255) NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email),
    INDEX idx_users_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: services
-- Catalog of home service categories offered on HOMEFIX
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 199.00,
    icon VARCHAR(100) DEFAULT 'bi-tools',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: technician_profiles
-- Detailed profile for technicians; stores parameters for the Intelligent Recommendation Engine
CREATE TABLE technician_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    service_id INT NOT NULL,
    experience_years INT NOT NULL DEFAULT 0,
    qualification VARCHAR(150) NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
    visiting_charges DECIMAL(10, 2) NOT NULL DEFAULT 150.00,
    service_area VARCHAR(100) NULL,
    city VARCHAR(50) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    total_jobs_completed INT DEFAULT 0,
    availability_status ENUM('available', 'busy', 'offline') DEFAULT 'available',
    id_proof_url VARCHAR(255) NULL,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_at DATETIME NULL,
    bio TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_technician_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_technician_service FOREIGN KEY (service_id) 
        REFERENCES services(id) ON DELETE RESTRICT,
    INDEX idx_tech_availability (availability_status),
    INDEX idx_tech_verification (verification_status),
    INDEX idx_tech_city (city),
    INDEX idx_tech_rating (average_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MODULE 2: COMPLAINT REGISTRATION & SERVICE BOOKING
-- =============================================================================

-- Table: bookings (also represents complaints registered by users)
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(30) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    technician_id INT NULL,
    problem_title VARCHAR(150) NOT NULL,
    problem_description TEXT NOT NULL,
    problem_image_url VARCHAR(255) NULL,
    voice_complaint_url VARCHAR(255) NULL,
    service_address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time_slot VARCHAR(50) NOT NULL,
    urgency_level ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
    booking_status ENUM(
        'pending',
        'technician_assigned',
        'accepted',
        'in_progress',
        'completed',
        'cancelled',
        'rejected'
    ) DEFAULT 'pending',
    estimated_cost DECIMAL(10, 2) DEFAULT 0.00,
    final_cost DECIMAL(10, 2) DEFAULT 0.00,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_service FOREIGN KEY (service_id) 
        REFERENCES services(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_technician FOREIGN KEY (technician_id) 
        REFERENCES technician_profiles(id) ON DELETE SET NULL,
    INDEX idx_booking_status (booking_status),
    INDEX idx_booking_date (scheduled_date),
    INDEX idx_booking_user (user_id),
    INDEX idx_booking_technician (technician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MODULE 3: INTELLIGENT TECHNICIAN RECOMMENDATION
-- =============================================================================

-- Table: technician_recommendations
-- Stores rule-based recommendation calculations for each booking/complaint
-- Criteria: service type, location, rating, experience, availability, and charges
CREATE TABLE technician_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    technician_id INT NOT NULL,
    match_score DECIMAL(5, 2) NOT NULL, -- Calculated score out of 100
    rank_position INT NOT NULL,         -- 1 = Top Recommended, 2 = Second, etc.
    score_breakdown JSON NULL,          -- JSON details of individual criteria weights
    was_selected BOOLEAN DEFAULT FALSE, -- Marked true if user selects this technician
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rec_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_technician FOREIGN KEY (technician_id) 
        REFERENCES technician_profiles(id) ON DELETE CASCADE,
    INDEX idx_rec_booking (booking_id),
    INDEX idx_rec_score (match_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MODULE 4: PAYMENT & SERVICE MANAGEMENT
-- =============================================================================

-- Table: payments
-- Handles billing and online/offline payment records (ready for Razorpay integration)
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash_on_service', 'razorpay', 'upi', 'card', 'net_banking') DEFAULT 'cash_on_service',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    razorpay_order_id VARCHAR(100) NULL,
    razorpay_payment_id VARCHAR(100) NULL,
    razorpay_signature VARCHAR(255) NULL,
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_status_logs
-- Audit log tracking service status transitions and technician progress
CREATE TABLE service_status_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    changed_by_user_id INT NOT NULL,
    status ENUM(
        'pending',
        'technician_assigned',
        'accepted',
        'in_progress',
        'completed',
        'cancelled',
        'rejected'
    ) NOT NULL,
    remarks TEXT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_status_log_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_log_user FOREIGN KEY (changed_by_user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status_log_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tool_material_suggestions
-- Rule-based system knowledge base providing recommended tools & materials to technicians
CREATE TABLE tool_material_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    issue_keyword VARCHAR(100) NOT NULL,
    recommended_tools TEXT NOT NULL,
    required_materials TEXT NOT NULL,
    safety_guidelines TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tool_service FOREIGN KEY (service_id) 
        REFERENCES services(id) ON DELETE CASCADE,
    INDEX idx_tool_keyword (issue_keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MODULE 5: ADMIN & SERVICE HISTORY
-- =============================================================================

-- Table: reviews
-- Customer feedback, comments, and 1 to 5 star ratings for completed services
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    technician_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_technician FOREIGN KEY (technician_id) 
        REFERENCES technician_profiles(id) ON DELETE CASCADE,
    INDEX idx_review_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: maintenance_reminders
-- Scheduled preventative maintenance alerts for users
CREATE TABLE maintenance_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    appliance_or_service_name VARCHAR(100) NOT NULL,
    reminder_title VARCHAR(150) NOT NULL,
    notes TEXT NULL,
    last_service_date DATE NULL,
    next_due_date DATE NOT NULL,
    frequency_months INT DEFAULT 6,
    status ENUM('active', 'dismissed', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reminder_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminder_service FOREIGN KEY (service_id) 
        REFERENCES services(id) ON DELETE RESTRICT,
    INDEX idx_reminder_due_date (next_due_date),
    INDEX idx_reminder_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin_logs
-- Audit log of administrative operations (verification, deactivation, service edits)
CREATE TABLE admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_log_user FOREIGN KEY (admin_user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_action (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SAMPLE SEED DATA FOR TESTING
-- =============================================================================

-- 1. Insert Initial Admin & Demo Accounts
-- Note: In production, passwords will be bcrypt-hashed via the backend registration module
INSERT INTO users (name, email, password, phone, role, city, pincode, status) VALUES
('System Administrator', 'admin@homefix.com', '$2b$10$YourHashedPasswordPlaceholderAdmin', '9876543210', 'admin', 'Bangalore', '560001', 'active'),
('Rahul Sharma', 'user@homefix.com', '$2b$10$YourHashedPasswordPlaceholderUser', '9876543211', 'user', 'Bangalore', '560034', 'active'),
('Amit Verma (Electrician)', 'tech.electric@homefix.com', '$2b$10$YourHashedPasswordPlaceholderTech1', '9876543212', 'technician', 'Bangalore', '560034', 'active'),
('Suresh Kumar (Plumber)', 'tech.plumber@homefix.com', '$2b$10$YourHashedPasswordPlaceholderTech2', '9876543213', 'technician', 'Bangalore', '560038', 'active');

-- 2. Insert Core Home Service Categories
INSERT INTO services (name, description, base_price, icon, is_active) VALUES
('Electrical Services', 'Fan repair, wiring, switchboard fixing, circuit breaker issues, MCB replacement', 249.00, 'bi-lightning-charge', TRUE),
('Plumbing Services', 'Pipe leakage, tap repair, drain cleaning, toilet and bathroom fittings', 199.00, 'bi-droplet-half', TRUE),
('Carpentry Services', 'Door lock installation, furniture repair, wooden cabinetry, hinge fixing', 299.00, 'bi-hammer', TRUE),
('AC & Appliance Repair', 'AC servicing, gas refill, refrigerator, washing machine and microwave repair', 399.00, 'bi-snow', TRUE),
('Home Painting', 'Interior painting, exterior painting, wall touch-ups, waterproof coating', 499.00, 'bi-paint-bucket', TRUE),
('Deep Home Cleaning', 'Kitchen deep cleaning, bathroom sanitization, sofa and carpet shampooing', 449.00, 'bi-stars', TRUE);

-- 3. Insert Sample Technician Profiles (for Intelligent Recommendation Engine testing)
INSERT INTO technician_profiles (user_id, service_id, experience_years, qualification, hourly_rate, visiting_charges, service_area, city, pincode, average_rating, total_reviews, total_jobs_completed, availability_status, verification_status, bio) VALUES
(3, 1, 5, 'Certified Electrician (ITI Electrical)', 250.00, 150.00, 'Koramangala / Indiranagar', 'Bangalore', '560034', 4.80, 42, 65, 'available', 'verified', 'Experienced residential electrician specializing in wiring and circuit repairs.'),
(4, 2, 7, 'Licensed Master Plumber', 200.00, 120.00, 'Indiranagar / Domlur', 'Bangalore', '560038', 4.60, 38, 52, 'available', 'verified', 'Expert in leak detection, bathroom fixtures, and emergency pipe repairs.');

-- 4. Insert Sample Tool & Material Suggestions (for Technicians)
INSERT INTO tool_material_suggestions (service_id, issue_keyword, recommended_tools, required_materials, safety_guidelines) VALUES
(1, 'switch spark / power failure', 'Digital Multimeter, Insulated screwdrivers, Wire stripper, Voltage tester pen', 'Copper wires, 16A modular switch, electrical insulation tape, wire nuts', 'Always shut off the main MCB breaker before touching exposed electrical wiring.'),
(2, 'water pipe leakage / tap repair', 'Adjustable pipe wrench, Plumber tape (PTFE), Plier set, Basin wrench, Bucket', 'Teflon thread seal tape, rubber O-ring washers, PVC solvent cement, replacement connector', 'Turn off the main overhead water valve before dismantling pipe fittings or tap assemblies.');

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
SELECT 
    table_name AS 'Table Name', 
    table_rows AS 'Estimated Rows'
FROM information_schema.tables
WHERE table_schema = 'homefix'
ORDER BY table_name;
