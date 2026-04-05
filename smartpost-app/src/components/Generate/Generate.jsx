import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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

    const [result, setResult] = useState(null);   // { post, imageUrl, sources }
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


    // Animate loading steps while request is in-flight
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

    useEffect(() => {
        fetchLinkedinStatus();
    }, []);


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
                headers: {
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });

            setResult(data);
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
    };

    const visibleSteps = includeImage ? LOADING_STEPS : LOADING_STEPS.slice(0, 3);

    return (
        <div className="generate-container">
            {/* Background blobs */}
            <div className="gen-blob gen-blob-1" />
            <div className="gen-blob gen-blob-2" />
            <div className="gen-blob gen-blob-3" />

            <div className="generate-content">
                {/* Header */}
                <div className="gen-header">
                    <h1>✨ AI Post Generator</h1>
                    <p>Describe your topic and let AI craft the perfect social media post.</p>
                </div>

                {/* Form card */}
                {!result && (
                    <form className="gen-card" onSubmit={handleGenerate}>
                        {/* Prompt */}
                        <div>
                            <label className="gen-label" htmlFor="gen-prompt">Your topic / prompt</label>
                            <textarea
                                id="gen-prompt"
                                className="gen-textarea"
                                placeholder="e.g. The rise of AI agents in 2025…"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Attitude */}
                        <div>
                            <span className="gen-label">Tone / Attitude</span>
                            <div className="attitude-group">
                                {ATTITUDES.map(({ value, emoji, label }) => (
                                    <React.Fragment key={value}>
                                        <input
                                            type="radio"
                                            name="attitude"
                                            id={`att-${value}`}
                                            className="attitude-option"
                                            value={value}
                                            checked={attitude === value}
                                            onChange={() => setAttitude(value)}
                                            disabled={loading}
                                        />
                                        <label htmlFor={`att-${value}`} className="attitude-label">
                                            <span className="attitude-emoji">{emoji}</span>
                                            {label}
                                        </label>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Image toggle */}
                        <div className="toggle-row">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    id="include-image"
                                    checked={includeImage}
                                    onChange={(e) => setIncludeImage(e.target.checked)}
                                    disabled={loading}
                                />
                                <span className="toggle-slider" />
                            </label>
                            <span className="toggle-text">
                                Include AI-generated image
                                <span>· takes a bit longer</span>
                            </span>
                        </div>

                        {/* Error */}
                        {error && <div className="gen-error">⚠️ {error}</div>}

                        {/* Submit */}
                        <button type="submit" className="gen-btn" disabled={loading || !prompt.trim()}>
                            {loading ? (
                                <>
                                    <span className="gen-spinner" />
                                    Generating…
                                </>
                            ) : (
                                <>✨ Generate Post</>
                            )}
                        </button>
                    </form>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="loading-card">
                        <div className="skeleton-line w-full" />
                        <div className="skeleton-line w-3-4" />
                        <div className="skeleton-line w-2-3" />
                        <div className="skeleton-line w-1-2" />
                        {includeImage && <div className="skeleton-img" />}

                        <div className="loading-steps">
                            {visibleSteps.map((step, i) => (
                                <div
                                    key={i}
                                    className={`loading-step${activeStep === i ? ' active' : ''}${doneSteps.includes(i) ? ' done' : ''}`}
                                >
                                    <span className="step-dot" />
                                    {step}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Result */}
                {result && !loading && (
                    <div className="result-card">
                        <div className="result-header">
                            <span className="result-title">Generated Post</span>
                            <div className="result-badges">
                                <span className="result-badge">📡 {result.scrapedCount ?? 0} sources scraped</span>
                                <span className="result-badge">🎭 {attitude}</span>
                            </div>
                        </div>

                        <div className="post-text-box">{result.post}</div>

                        {result.imageUrl && (
                            <img
                                src={`http://localhost:4000${result.imageUrl}`}
                                alt="AI generated"
                                className="gen-result-image"
                            />
                        )}

                        {error && <div className="gen-error">⚠️ {error}</div>}

                        <div className="result-actions">
                            <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
                                {copied ? '✓ Copied!' : '📋 Copy Post'}
                            </button>
                            {linkedinStatus.connected && (
                                <button
                                    className="publish-li-btn"
                                    onClick={handlePublishToLinkedIn}
                                    disabled={publishing}
                                >
                                    {publishing ? <span className="gen-spinner" /> : '🔵 Publish to LinkedIn'}
                                </button>
                            )}
                            <button className="new-btn" onClick={handleReset}>
                                ↩ Generate Another
                            </button>
                        </div>
                        {publishSuccess && <div className="publish-success">✅ {publishSuccess}</div>}

                    </div>
                )}
            </div>
        </div>
    );
}
