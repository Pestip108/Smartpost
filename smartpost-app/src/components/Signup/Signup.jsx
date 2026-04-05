import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const getStrength = (pw) => {
        if (!pw) return 0;
        let s = 0;
        if (pw.length >= 6)  s++;
        if (pw.length >= 10) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return s;
    };

    const strength = getStrength(password);
    const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthColors = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setIsLoading(true);
        try {
            await axios.post('http://localhost:4000/api/auth/signup', { email, password });
            navigate('/verify-email', { state: { email } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left branding panel */}
            <div className="auth-branding signup-branding">
                <div className="auth-branding-inner">
                    <div className="auth-brand-logo">
                        <span className="auth-brand-icon">⚡</span>
                        <span className="auth-brand-name">Smartpost</span>
                    </div>
                    <h2 className="auth-brand-headline">
                        Your social media,<br /><span>on autopilot</span>
                    </h2>
                    <p className="auth-brand-sub">
                        Join Smartpost and start generating professional posts with AI in under a minute.
                    </p>
                    <ul className="auth-feature-list">
                        <li><span className="feat-check">✓</span> Free to get started</li>
                        <li><span className="feat-check">✓</span> Connect LinkedIn &amp; Reddit</li>
                        <li><span className="feat-check">✓</span> Set recurring post schedules</li>
                        <li><span className="feat-check">✓</span> AI images for your posts</li>
                    </ul>
                    <div className="auth-branding-blobs signup-blobs">
                        <div className="brand-blob brand-blob-1" />
                        <div className="brand-blob brand-blob-2" />
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="auth-form-panel">
                <div className="auth-form-card">
                    <div className="auth-form-header">
                        <h1>Create account</h1>
                        <p>Get started with Smartpost today</p>
                    </div>

                    {error && <div className="auth-banner auth-banner-error">{error}</div>}

                    <form onSubmit={handleSignup} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="signup-email" className="auth-label">Email address</label>
                            <input
                                id="signup-email"
                                type="email"
                                className="auth-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="signup-password" className="auth-label">Password</label>
                            <div className="auth-input-wrap">
                                <input
                                    id="signup-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="auth-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="pw-toggle"
                                    onClick={() => setShowPassword(s => !s)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                            {password && (
                                <div className="strength-wrap">
                                    <div className="strength-bar">
                                        {[1,2,3,4,5].map(i => (
                                            <div
                                                key={i}
                                                className="strength-seg"
                                                style={{ background: i <= strength ? strengthColors[strength] : 'var(--border)' }}
                                            />
                                        ))}
                                    </div>
                                    <span className="strength-label" style={{ color: strengthColors[strength] }}>
                                        {strengthLabels[strength]}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="signup-confirm" className="auth-label">Confirm password</label>
                            <input
                                id="signup-confirm"
                                type="password"
                                className="auth-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isLoading}
                            id="signup-submit"
                        >
                            {isLoading ? <span className="auth-spinner" /> : 'Create Account'}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Already have an account? <Link to="/login" className="auth-switch-link">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
