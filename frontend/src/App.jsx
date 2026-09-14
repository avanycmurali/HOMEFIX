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
              <Route
                path="/"
                element={
                  <Home
                    healthData={healthData}
                    healthLoading={healthLoading}
                    onRefreshHealth={fetchHealth}
                  />
                }
              />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/book-service" element={<BookService />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
