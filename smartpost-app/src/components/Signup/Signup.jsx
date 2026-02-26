import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setIsLoading(true);

        try {
            await axios.post('http://localhost:4000/api/auth/signup', {
                email,
                password
            });
            // Redirect to verification page, pass email in state
            navigate('/verify-email', { state: { email } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card signup-card glassmorphism">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Smartpost to manage your socials</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSignup} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-btn submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="loader"></span> : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login" className="auth-link">Log in</Link></p>
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2 signup-blob"></div>
        </div>
    );
};

export default Signup;
