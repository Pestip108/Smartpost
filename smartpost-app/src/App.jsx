import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import EmailVerify from './components/EmailVerify/EmailVerify';
import Generate from './components/Generate/Generate';
import Scheduler from './components/Scheduler/Scheduler';
import Reddit from './components/Reddit/Reddit';
import './App.css';

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<EmailVerify />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/schedule" element={<Scheduler />} />
        <Route path="/reddit" element={<Reddit />} />
        <Route path="/" element={
          <div className="placeholder-home">
            <h1>Smartpost Dashboard</h1>
            <p>Welcome to your workspace. Generate AI-powered social media posts in seconds.</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
              <Link to="/generate">
                <button className="auth-btn" style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', padding: '12px 28px' }}>
                  ✨ Generate a Post
                </button>
              </Link>
              <Link to="/schedule">
                <button className="auth-btn" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', border: 'none', padding: '12px 28px' }}>
                  🗓️ Schedule Posts
                </button>
              </Link>
              <Link to="/reddit">
                <button className="auth-btn" style={{ background: 'linear-gradient(135deg,#ff4500,#ff6634)', color: '#fff', border: 'none', padding: '12px 28px' }}>
                  🟠 Reddit
                </button>
              </Link>
              <button onClick={() => { localStorage.clear(); window.location.href = '/login' }} className="auth-btn">
                Logout
              </button>
            </div>
          </div>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
