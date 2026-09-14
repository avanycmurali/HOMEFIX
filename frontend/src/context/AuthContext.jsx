import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerUserApi, registerTechnicianApi, getMeApi } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [technicianProfile, setTechnicianProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('homefix_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hydrate auth state on startup
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('homefix_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await getMeApi(storedToken);
        if (res.ok && res.data.success) {
          setUser(res.data.user);
          setTechnicianProfile(res.data.technicianProfile || null);
          setToken(storedToken);
        } else {
          // Token invalid or expired
          localStorage.removeItem('homefix_token');
          setUser(null);
          setTechnicianProfile(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('homefix_token');
        setUser(null);
        setTechnicianProfile(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Log in a user (Customer, Technician, or Admin)
   */
  const login = async ({ email, password, expectedRole }) => {
    setError(null);
    const res = await loginApi({ email, password, expectedRole });

    if (res.ok && res.data.success) {
      const { token: receivedToken, user: receivedUser, technicianProfile: receivedProfile } = res.data;
      localStorage.setItem('homefix_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setTechnicianProfile(receivedProfile || null);
      return { success: true, user: receivedUser, technicianProfile: receivedProfile };
    } else {
      const message = res.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, message };
    }
  };

  /**
   * Register a new Customer / User
   */
  const registerCustomer = async (userData) => {
    setError(null);
    const res = await registerUserApi(userData);

    if (res.ok && res.data.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      localStorage.setItem('homefix_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setTechnicianProfile(null);
      return { success: true, user: receivedUser };
    } else {
      const message = res.data?.message || 'Registration failed. Please check form inputs.';
      setError(message);
      return { success: false, message };
    }
  };

  /**
   * Register a new Service Technician
   */
  const registerTechnician = async (techData) => {
    setError(null);
    const res = await registerTechnicianApi(techData);

    if (res.ok && res.data.success) {
      const { token: receivedToken, user: receivedUser, technicianProfile: receivedProfile } = res.data;
      localStorage.setItem('homefix_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setTechnicianProfile(receivedProfile || null);
      return { success: true, user: receivedUser, technicianProfile: receivedProfile };
    } else {
      const message = res.data?.message || 'Technician registration failed.';
      setError(message);
      return { success: false, message };
    }
  };

  /**
   * Log out the active session
   */
  const logout = () => {
    localStorage.removeItem('homefix_token');
    setUser(null);
    setTechnicianProfile(null);
    setToken(null);
    setError(null);
  };

  const clearError = () => setError(null);

  const value = {
    user,
    technicianProfile,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    registerCustomer,
    registerTechnician,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
