import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EmailVerify.css';

const EmailVerify = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
    const [canResend, setCanResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds before resend is allowed

    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email;
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) {
            navigate('/signup');
            return;
        }

        // Main countdown timer (15 mins)
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Resend cooldown timer
        let cooldownTimer;
        if (!canResend) {
            cooldownTimer = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            clearInterval(timer);
            if (cooldownTimer) clearInterval(cooldownTimer);
        };
    }, [email, navigate, canResend]);

    const handleChange = (index, e) => {
        const value = e.target.value;
        if (isNaN(value)) return;

        const newCode = [...code];
        // Take only the last character if they pasted or typed quickly
        newCode[index] = value.substring(value.length - 1);
        setCode(newCode);

        // Move to next input if there's a value
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Move to previous input on backspace if current is empty
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.some(char => isNaN(char))) return;

        const newCode = [...code];
        pastedData.forEach((char, index) => {
            if (index < 6) newCode[index] = char;
        });
        setCode(newCode);

        // Focus last filled input
        const focusIndex = Math.min(pastedData.length, 5);
        inputRefs.current[focusIndex].focus();
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');

        if (fullCode.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:4000/api/auth/verify-email', {
                email,
                code: fullCode
            });

            // Auto-login the user
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
            setResendCooldown(60); // Reset cooldown
            setTimeLeft(15 * 60); // Reset main timer
            setCode(['', '', '', '', '', '']); // Clear input
            inputRefs.current[0].focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setIsResending(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="auth-container">
            <div className="auth-card verify-card glassmorphism">
                <div className="auth-header">
                    <h2>Check Your Email</h2>
                    <p>We sent a 6-digit code to <br /><strong>{email}</strong></p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleVerify} className="auth-form verify-form">
                    <div className="code-container" onPaste={handlePaste}>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(index, e)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                ref={el => inputRefs.current[index] = el}
                                className="code-input"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    <div className="timer-display">
                        Code expires in <span className={timeLeft < 60 ? 'text-danger' : ''}>{formatTime(timeLeft)}</span>
                    </div>

                    <button
                        type="submit"
                        className="auth-btn submit-btn"
                        disabled={isLoading || timeLeft === 0 || code.join('').length !== 6}
                    >
                        {isLoading ? <span className="loader"></span> : 'Verify Email'}
                    </button>
                </form>

                <div className="auth-footer resend-section">
                    <p>Didn't receive the code?</p>
                    <button
                        onClick={handleResend}
                        className="resend-btn"
                        disabled={!canResend || isResending}
                    >
                        {isResending ? 'Sending...' : canResend ? 'Resend Code' : `Resend available in ${resendCooldown}s`}
                    </button>
                </div>
            </div>

            <div className="blob blob-1"></div>
            <div className="blob blob-2 verify-blob"></div>
        </div>
    );
};

export default EmailVerify;
