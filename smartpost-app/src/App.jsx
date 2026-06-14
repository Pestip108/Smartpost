import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import EmailVerify from './components/EmailVerify/EmailVerify';
import Generate from './components/Generate/Generate';
import Scheduler from './components/Scheduler/Scheduler';
import LinkedIn from './components/LinkedIn/LinkedIn';
import Dashboard from './components/Dashboard/Dashboard';
import Drafts from './components/Drafts/Drafts';
import Navbar from './components/Navbar/Navbar';
import './App.css';

// ── Theme Context ──────────────────────────────
export const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

// ── Auth guard ────────────────────────────────
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    const exp = decoded.exp;
    const now = Date.now() / 1000;
    return exp < now;
  } catch (e) {
    return true;
  }
};

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  
  if (!token || isTokenExpired(token)) {
    if (token) {
      localStorage.clear();
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
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
        <Route path="/drafts" element={
          <RequireAuth>
            <AppLayout><Drafts /></AppLayout>
          </RequireAuth>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}

export default App;
