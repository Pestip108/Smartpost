import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../App';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/',         label: 'Dashboard', icon: '⬡' },
  { to: '/generate', label: 'Generate',  icon: '✨' },
  { to: '/schedule', label: 'Schedule',  icon: '🗓' },
  { to: '/linkedin', label: 'LinkedIn',  icon: '🔵' },
  { to: '/reddit',   label: 'Reddit',    icon: '🟠' },
];

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const initials = (u) => {
    if (!u) return 'U';
    const name = u.name || u.email || '';
    return name.split(/[\s@]/)[0]?.[0]?.toUpperCase() || 'U';
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      <nav className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon">⚡</span>
          <span className="navbar-logo-text">Smartpost</span>
        </Link>

        {/* Desktop nav links */}
        <div className="navbar-links">
          {NAV_LINKS.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`navbar-link${location.pathname === to ? ' active' : ''}`}
            >
              <span className="navbar-link-icon">{icon}</span>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="navbar-actions">
          {/* Theme toggle */}
          <button
            className="navbar-icon-btn theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* User avatar */}
          <div className="navbar-avatar" title={user?.email || 'User'}>
            {initials(user)}
          </div>

          {/* Logout */}
          <button className="navbar-icon-btn logout-btn" onClick={handleLogout} title="Logout">
            <LogoutIcon />
          </button>

          {/* Mobile hamburger */}
          <button
            className="navbar-icon-btn hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`mobile-link${location.pathname === to ? ' active' : ''}`}
            >
              <span>{icon}</span>{label}
            </Link>
          ))}
          <div className="mobile-divider" />
          <button className="mobile-link mobile-logout" onClick={handleLogout}>
            <LogoutIcon /> Logout
          </button>
        </div>
      )}
    </>
  );
}
