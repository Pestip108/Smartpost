import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import EmailVerify from './components/EmailVerify/EmailVerify';
import './App.css';

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<EmailVerify />} />
        <Route path="/" element={
          <div className="placeholder-home">
            <h1>Smartpost Dashboard</h1>
            <p>Welcome to your workspace.</p>
            <button onClick={() => { localStorage.clear(); window.location.href = '/login' }} className="auth-btn">
              Logout
            </button>
          </div>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
