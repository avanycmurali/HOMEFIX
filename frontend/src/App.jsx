import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
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
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        <Home
          healthData={healthData}
          healthLoading={healthLoading}
          onRefreshHealth={fetchHealth}
        />
      </main>
      <Footer />
    </div>
  );
}
