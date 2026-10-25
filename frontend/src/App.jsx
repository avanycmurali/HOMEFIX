import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BookService from './pages/BookService.jsx';
import MyBookings from './pages/MyBookings.jsx';
import ServiceHistory from './pages/ServiceHistory.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import { checkBackendHealth } from './services/api.js';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const fetchHealth = async () => {
    setHealthLoading(true);
    const result = await checkBackendHealth();
    setHealthData(result);
    setHealthLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="d-flex flex-column min-vh-100">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    healthData={healthData}
                    healthLoading={healthLoading}
                    onRefreshHealth={fetchHealth}
                  />
                }
              />
              <Route path="/book-service" element={<BookService />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/service-history" element={<ServiceHistory />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
