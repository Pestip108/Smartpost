import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await axios.post('http://localhost:4000/api/auth/login', { email, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left branding panel */}
            <div className="auth-branding">
                <div className="auth-branding-inner">
                    <div className="auth-brand-logo">
                        <span className="auth-brand-icon">⚡</span>
                        <span className="auth-brand-name">Smartpost</span>
                    </div>
                    <h2 className="auth-brand-headline">
                        Create posts that <span>stand out</span>
                    </h2>
                    <p className="auth-brand-sub">
                        AI-powered social media posts for LinkedIn and Reddit — generated and scheduled automatically.
                    </p>
                    <ul className="auth-feature-list">
                        <li><span className="feat-check">✓</span> AI-generated posts in seconds</li>
                        <li><span className="feat-check">✓</span> Schedule recurring content</li>
                        <li><span className="feat-check">✓</span> Publish directly to LinkedIn &amp; Reddit</li>
                        <li><span className="feat-check">✓</span> Optional AI-generated images</li>
                    </ul>
                    <div className="auth-branding-blobs">
                        <div className="brand-blob brand-blob-1" />
                        <div className="brand-blob brand-blob-2" />
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="auth-form-panel">
                <div className="auth-form-card">
                    <div className="auth-form-header">
                        <h1>Welcome back</h1>
                        <p>Sign in to your Smartpost account</p>
                    </div>

                    {error && <div className="auth-banner auth-banner-error">{error}</div>}

                    <form onSubmit={handleLogin} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="login-email" className="auth-label">Email address</label>
                            <input
                                id="login-email"
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
                            <div className="auth-label-row">
                                <label htmlFor="login-password" className="auth-label">Password</label>
                                <span className="auth-forgot">Forgot password?</span>
                            </div>
                            <div className="auth-input-wrap">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="auth-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="pw-toggle"
                                    onClick={() => setShowPassword(s => !s)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isLoading}
                            id="login-submit"
                        >
                            {isLoading ? <span className="auth-spinner" /> : 'Sign In'}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Don't have an account? <Link to="/signup" className="auth-switch-link">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
