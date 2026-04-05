import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Generate.css';

const API_URL = 'http://localhost:4000/api/generate';

const ATTITUDES = [
    { value: 'Neutral', emoji: '⚖️', label: 'Neutral' },
    { value: 'Professional', emoji: '💼', label: 'Professional' },
    { value: 'Casual', emoji: '😊', label: 'Casual' },
    { value: 'Viral', emoji: '🔥', label: 'Viral' },
];

const LOADING_STEPS = [
    'Scraping Google trends…',
    'Scraping Facebook posts…',
    'Generating post with AI…',
    'Creating image…',
];

export default function Generate() {
    const [prompt, setPrompt] = useState('');
    const [attitude, setAttitude] = useState('Neutral');
    const [includeImage, setIncludeImage] = useState(false);
    const [linkedinStatus, setLinkedinStatus] = useState({ connected: false });

    const [loading, setLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(-1);
    const [doneSteps, setDoneSteps] = useState([]);

    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState('');

    const stepTimers = useRef([]);

    const fetchLinkedinStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('http://localhost:4000/api/linkedin/status', {
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setLinkedinStatus(data);
        } catch (err) {
            console.error("Failed to fetch LinkedIn status", err);
        }
    };

    useEffect(() => {
        if (loading) {
            setActiveStep(0);
            setDoneSteps([]);
            const steps = includeImage ? LOADING_STEPS : LOADING_STEPS.slice(0, 3);
            steps.forEach((_, i) => {
                const t = setTimeout(() => {
                    setActiveStep(i);
                    setDoneSteps((prev) => (i > 0 ? [...prev, i - 1] : prev));
                }, i * 1800);
                stepTimers.current.push(t);
            });
        } else {
            stepTimers.current.forEach(clearTimeout);
            stepTimers.current = [];
            setActiveStep(-1);
        }
    }, [loading, includeImage]);

    useEffect(() => { fetchLinkedinStatus(); }, []);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setResult(null);
        setError('');
        setDoneSteps([]);

        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(API_URL, {
                prompt: prompt.trim(),
                attitude,
                includeImage,
            }, {
                timeout: 120_000,
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setResult(data);
            setDoneSteps(includeImage ? [0, 1, 2, 3] : [0, 1, 2]); // Mark all steps complete
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result?.post) return;
        navigator.clipboard.writeText(result.post).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handlePublishToLinkedIn = async () => {
        if (!result?.post) return;
        setPublishing(true);
        setPublishSuccess('');
        setError('');

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:4000/api/linkedin/post', {
                text: result.post
            }, {
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setPublishSuccess('Post published to LinkedIn!');
            setTimeout(() => setPublishSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to publish to LinkedIn');
        } finally {
            setPublishing(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setError('');
        setDoneSteps([]);
        setPrompt('');
    };

    const visibleSteps = includeImage ? LOADING_STEPS : LOADING_STEPS.slice(0, 3);

    return (
        <div className="content-container generate-container">
            <Link to="/" className="back-link">← Back to Dashboard</Link>

            <div className="section-title-row">
                <div className="page-header">
                    <span className="page-header-icon">✨</span>
                    <div>
                        <h1 className="page-title">AI Post Generator</h1>
                        <p className="page-subtitle">Describe your topic and let AI craft the perfect social media post.</p>
                    </div>
                </div>
            </div>

            {!result && !loading && (
                <form className="glass generate-card" onSubmit={handleGenerate}>
                    {error && <div className="banner banner-error">{error}</div>}

                    <div className="form-group">
                        <label className="sp-label" htmlFor="gen-prompt">Your topic / prompt</label>
                        <textarea
                            id="gen-prompt"
                            className="sp-textarea"
                            placeholder="e.g. The rise of AI agents in 2025 and how they change development workflows…"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <span className="sp-label">Tone / Attitude</span>
                        <div className="pill-group">
                            {ATTITUDES.map(({ value, emoji, label }) => (
                                <React.Fragment key={value}>
                                    <input
                                        type="radio"
                                        name="attitude"
                                        id={`att-${value}`}
                                        className="pill-radio"
                                        value={value}
                                        checked={attitude === value}
                                        onChange={() => setAttitude(value)}
                                        disabled={loading}
                                    />
                                    <label htmlFor={`att-${value}`} className="pill-label">
                                        <span>{emoji}</span> {label}
                                    </label>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="toggle-wrap toggle-image">
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={includeImage}
                                onChange={(e) => setIncludeImage(e.target.checked)}
                                disabled={loading}
                            />
                            <span className="toggle-track" />
                        </label>
                        <span className="toggle-label">
                            Include AI-generated image
                            <small>· Takes a bit longer</small>
                        </span>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading || !prompt.trim()}>
                        ✨ Generate Post
                    </button>
                </form>
            )}

            {/* Loading State */}
            {loading && (
                <div className="glass loading-card">
                    <div className="loading-orbit">
                        <div className="orbit-center">🧠</div>
                        <div className="orbit-ring" />
                        <div className="orbit-ring orbit-ring-2" />
                        <div className="orbit-dot" />
                    </div>

                    <div className="loading-text">Crafting your post…</div>

                    <div className="loading-steps">
                        {visibleSteps.map((step, i) => (
                            <div
                                key={i}
                                className={`loading-step${activeStep === i ? ' active' : ''}${doneSteps.includes(i) ? ' done' : ''}`}
                            >
                                <span className="step-indicator">
                                    {doneSteps.includes(i) ? '✓' : activeStep === i ? <span className="spinner spinner-dark" /> : '·'}
                                </span>
                                {step}
                            </div>
                        ))}
                    </div>

                    <div className="skeleton loading-skel-1" />
                    <div className="skeleton loading-skel-2" />
                    <div className="skeleton loading-skel-3" />
                </div>
            )}

            {/* Result State */}
            {result && !loading && (
                <div className="glass result-card">
                    <div className="result-header">
                        <h2 className="result-title">Generated Post</h2>
                        <div className="result-badges">
                            <span className="chip chip-default">📡 {result.scrapedCount ?? 0} sources</span>
                            <span className="chip chip-default">🎭 {attitude}</span>
                        </div>
                    </div>

                    <div className="result-content-body">
                        {result.post}
                    </div>

                    {result.imageUrl && (
                        <div className="result-image-wrap">
                            <img src={`http://localhost:4000${result.imageUrl}`} alt="AI generated" className="result-image" />
                        </div>
                    )}

                    {error && <div className="banner banner-error">{error}</div>}
                    {publishSuccess && <div className="banner banner-success">✅ {publishSuccess}</div>}

                    <div className="result-actions">
                        <button className="btn btn-ghost" onClick={handleCopy}>
                            {copied ? '✓ Copied!' : '📋 Copy Post'}
                        </button>
                        {linkedinStatus.connected && (
                            <button
                                className="btn btn-primary"
                                onClick={handlePublishToLinkedIn}
                                disabled={publishing}
                            >
                                {publishing ? <span className="spinner" /> : '🔵 Publish to LinkedIn'}
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button className="btn btn-ghost" onClick={handleReset}>
                            ↩ Generate Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
