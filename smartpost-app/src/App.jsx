import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import EmailVerify from './components/EmailVerify/EmailVerify';
import Generate from './components/Generate/Generate';
import Scheduler from './components/Scheduler/Scheduler';
import Reddit from './components/Reddit/Reddit';
import LinkedIn from './components/LinkedIn/LinkedIn';
import Dashboard from './components/Dashboard/Dashboard';
import Navbar from './components/Navbar/Navbar';
import './App.css';

// ── Theme Context ──────────────────────────────
export const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

// ── Auth guard ────────────────────────────────
function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── Layout with Navbar ────────────────────────
function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="page-wrapper">{children}</main>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('sp-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    localStorage.setItem('sp-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Ambient background blobs (always rendered) */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <Routes>
        {/* Auth pages — no navbar */}
        <Route path="/login"        element={<Login />} />
        <Route path="/signup"       element={<Signup />} />
        <Route path="/verify-email" element={<EmailVerify />} />

        {/* App pages — with navbar */}
        <Route path="/" element={
          <RequireAuth>
            <AppLayout><Dashboard /></AppLayout>
          </RequireAuth>
        } />
        <Route path="/generate" element={
          <RequireAuth>
            <AppLayout><Generate /></AppLayout>
          </RequireAuth>
        } />
        <Route path="/schedule" element={
          <RequireAuth>
            <AppLayout><Scheduler /></AppLayout>
          </RequireAuth>
        } />
        <Route path="/linkedin" element={
          <RequireAuth>
            <AppLayout><LinkedIn /></AppLayout>
          </RequireAuth>
        } />
        <Route path="/reddit" element={
          <RequireAuth>
            <AppLayout><Reddit /></AppLayout>
          </RequireAuth>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}

export default App;
