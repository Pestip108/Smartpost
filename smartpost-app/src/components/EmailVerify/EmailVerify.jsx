import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EmailVerify.css';

const EmailVerify = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [canResend, setCanResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(60);

    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email;
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) { navigate('/signup'); return; }

        const timer = setInterval(() => {
            setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
        }, 1000);

        let cooldownTimer;
        if (!canResend) {
            cooldownTimer = setInterval(() => {
                setResendCooldown(prev => { if (prev <= 1) { setCanResend(true); return 0; } return prev - 1; });
            }, 1000);
        }
        return () => { clearInterval(timer); if (cooldownTimer) clearInterval(cooldownTimer); };
    }, [email, navigate, canResend]);

    const handleChange = (index, e) => {
        const value = e.target.value;
        if (isNaN(value)) return;
        const newCode = [...code];
        newCode[index] = value.substring(value.length - 1);
        setCode(newCode);
        if (value && index < 5) inputRefs.current[index + 1].focus();
    };
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1].focus();
    };
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.some(c => isNaN(c))) return;
        const newCode = [...code];
        pastedData.forEach((char, i) => { if (i < 6) newCode[i] = char; });
        setCode(newCode);
        const focusIndex = Math.min(pastedData.length, 5);
        inputRefs.current[focusIndex]?.focus();
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length !== 6) { setError('Please enter the complete 6-digit code'); return; }
        setError('');
        setIsLoading(true);
        try {
            const response = await axios.post('http://localhost:4000/api/auth/verify-email', { email, code: fullCode });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setError('');
        setIsResending(true);
        try {
            await axios.post('http://localhost:4000/api/auth/resend-code', { email });
            setCanResend(false);
            setResendCooldown(60);
            setTimeLeft(15 * 60);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setIsResending(false);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    const progress = (timeLeft / (15 * 60)) * 100;
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    const offset = circ * (1 - progress / 100);

    return (
        <div className="verify-page">
            <div className="verify-blobs">
                <div className="verify-blob-1" />
                <div className="verify-blob-2" />
            </div>

            <div className="verify-card">
                {/* Animated envelope icon */}
                <div className="verify-icon-wrap">
                    <div className="verify-icon-ring" />
                    <span className="verify-icon">✉️</span>
                </div>

                <div className="verify-header">
                    <h1>Check your email</h1>
                    <p>We sent a 6-digit code to</p>
                    <strong className="verify-email">{email}</strong>
                </div>

                {error && <div className="auth-banner auth-banner-error">{error}</div>}

                <form onSubmit={handleVerify} className="verify-form">
                    <div className="otp-row" onPaste={handlePaste}>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                inputMode="numeric"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(index, e)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                ref={el => inputRefs.current[index] = el}
                                className="otp-input"
                                autoFocus={index === 0}
                                id={`otp-${index}`}
                            />
                        ))}
                    </div>

                    {/* Circular countdown timer */}
                    <div className="timer-wrap">
                        <svg className="timer-ring" width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
                            <circle
                                cx="50" cy="50" r={radius}
                                fill="none"
                                stroke={timeLeft < 60 ? 'var(--danger)' : 'var(--primary)'}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circ}
                                strokeDashoffset={offset}
                                transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                            />
                        </svg>
                        <div className={`timer-text${timeLeft < 60 ? ' timer-danger' : ''}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                    <p className="timer-label">Code expires in {formatTime(timeLeft)}</p>

                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={isLoading || timeLeft === 0 || code.join('').length !== 6}
                        id="verify-submit"
                    >
                        {isLoading ? <span className="auth-spinner" /> : 'Verify Email'}
                    </button>
                </form>

                <div className="verify-resend">
                    <p>Didn't receive the code?</p>
                    <button
                        onClick={handleResend}
                        className="resend-btn"
                        disabled={!canResend || isResending}
                    >
                        {isResending ? 'Sending…' : canResend ? 'Resend Code' : `Resend available in ${resendCooldown}s`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerify;
