import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CalendarDays, Briefcase, Bot, Radio, Theater, Timer, Zap, Lightbulb, Link2, RefreshCw } from 'lucide-react';
import './Dashboard.css';

const FEATURES = [
  {
    id: 'generate',
    to: '/generate',
    icon: <Sparkles size={22} />,
    title: 'AI Post Generator',
    desc: 'Enter a topic and let AI craft the perfect social media post — with optional AI-generated images.',
    badge: 'Powered by AI',
    color: 'indigo',
  },
  {
    id: 'schedule',
    to: '/schedule',
    icon: <CalendarDays size={22} />,
    title: 'Post Scheduler',
    desc: 'Set a recurring schedule and have fresh AI-generated posts delivered automatically to your feeds.',
    badge: 'Recurring',
    color: 'cyan',
  },
  {
    id: 'linkedin',
    to: '/linkedin',
    icon: <Briefcase size={22} />,
    title: 'LinkedIn',
    desc: 'Connect your LinkedIn account and publish professional posts directly from Smartpost.',
    badge: 'Connected',
    color: 'linkedin',
  },
];

const STATS = [
  { label: 'AI Models', value: '3+',    icon: <Bot size={18} /> },
  { label: 'Platforms',  value: '2',    icon: <Radio size={18} /> },
  { label: 'Post Tones', value: '4',    icon: <Theater size={18} /> },
  { label: 'Schedule Intervals', value: '8', icon: <Timer size={18} /> },
];

export default function Dashboard() {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  const firstName = (user?.name || user?.email || 'there').split(/[\s@]/)[0];

  return (
    <div className="dashboard">
      {/* Hero section */}
      <section className="dash-hero">
        <div className="dash-hero-badge">
          <Zap size={14} /> AI-Powered Social Media
        </div>
        <h1 className="dash-hero-title">
          Welcome back,<br />
          <span className="dash-hero-name">{firstName}</span>
        </h1>
        <p className="dash-hero-subtitle">
          Generate, schedule, and publish AI-crafted posts to LinkedIn — all in one place.
        </p>
        <div className="dash-hero-actions">
          <Link to="/generate" className="btn btn-primary dash-cta">
            <Sparkles size={16} /> Generate a Post
          </Link>
          <Link to="/schedule" className="btn btn-ghost dash-cta-ghost">
            <CalendarDays size={16} /> Schedule Posts
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <div className="dash-stats">
        {STATS.map(({ label, value, icon }) => (
          <div className="dash-stat" key={label}>
            <span className="dash-stat-icon">{icon}</span>
            <div>
              <div className="dash-stat-value">{value}</div>
              <div className="dash-stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature cards grid */}
      <section className="dash-features-section">
        <div className="section-title">What you can do</div>
        <div className="dash-grid">
          {FEATURES.map((f) => (
            <Link to={f.to} key={f.id} className={`dash-card dash-card-${f.color}`}>
              <div className="dash-card-top">
                <div className="dash-card-icon">{f.icon}</div>
                <span className="dash-card-badge">{f.badge}</span>
              </div>
              <h3 className="dash-card-title">{f.title}</h3>
              <p className="dash-card-desc">{f.desc}</p>
              <div className="dash-card-cta">
                Get Started <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick tips */}
      <section className="dash-tips">
        <div className="section-title">Quick Tips</div>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon"><Lightbulb size={18} /></span>
            <div>
              <strong>Start with Generate</strong>
              <p>Pick a topic, choose a tone, and get a post in seconds. Then publish directly to LinkedIn.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon"><Link2 size={18} /></span>
            <div>
              <strong>Connect your accounts</strong>
              <p>Link LinkedIn first from its page before scheduling or posting.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon"><RefreshCw size={18} /></span>
            <div>
              <strong>Set it and forget it</strong>
              <p>Use the Scheduler to auto-generate and auto-post on a repeating interval.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
