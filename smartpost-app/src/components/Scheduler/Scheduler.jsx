import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Scheduler.css';

const API_URL = 'http://localhost:4000/api/scheduler';

const ATTITUDES = [
    { value: 'Neutral', emoji: '⚖️', label: 'Neutral' },
    { value: 'Professional', emoji: '💼', label: 'Professional' },
    { value: 'Casual', emoji: '😊', label: 'Casual' },
    { value: 'Viral', emoji: '🔥', label: 'Viral' },
];

const INTERVAL_OPTIONS = [
    { label: 'Every 2 minutes', value: 0.333 },
    { label: 'Every 1 hours', value: 1 },
    { label: 'Every 3 hours', value: 3 },
    { label: 'Every 6 hours', value: 6 },
    { label: 'Every 12 hours', value: 12 },
    { label: 'Every 24 hours', value: 24 },
    { label: 'Every 48 hours', value: 48 },
    { label: 'Every week', value: 168 },
];

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export default function Scheduler() {
    const [topic, setTopic] = useState('');
    const [attitude, setAttitude] = useState('Neutral');
    const [includeImage, setIncludeImage] = useState(false);
    const [intervalHours, setIntervalHours] = useState(24);
    const [scheduledAt, setScheduledAt] = useState('');
    const [publishLinkedIn, setPublishLinkedIn] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [linkedinStatus, setLinkedinStatus] = useState({ connected: false });

    useEffect(() => {
        const d = new Date(Date.now());
        const pad = (n) => String(n).padStart(2, '0');
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setScheduledAt(local);

        const fetchStatus = async () => {
            try {
                const { data } = await axios.get('http://localhost:4000/api/linkedin/status', { headers: authHeaders() });
                setLinkedinStatus(data);
            } catch (err) { }
        };
        fetchStatus();
    }, []);

    const fetchTasks = async () => {
        setLoadingTasks(true);
        try {
            const { data } = await axios.get(API_URL, { headers: authHeaders() });
            setTasks(data);
        } catch { } finally { setLoadingTasks(false); }
    };

    useEffect(() => { fetchTasks(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!topic.trim()) return setError('Topic is required.');
        if (!scheduledAt) return setError('Please choose a start date & time.');

        setSubmitting(true);
        try {
            await axios.post(
                API_URL,
                {
                    topic: topic.trim(),
                    attitude,
                    includeImage,
                    publishLinkedIn,
                    intervalHours: Number(intervalHours),
                    scheduledAt: new Date(scheduledAt).toISOString(),
                },
                { headers: authHeaders() }
            );
            setSuccess('✅ Scheduled! Your post will be generated automatically.');
            setTopic('');
            await fetchTasks();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this scheduled task?')) return;
        try {
            await axios.delete(`${API_URL}/${id}`, { headers: authHeaders() });
            setTasks((prev) => prev.filter((t) => t.id !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel task.');
        }
    };

    return (
        <div className="content-container scheduler-container">
            <Link to="/" className="back-link">← Back to Dashboard</Link>

            <div className="page-header">
                <span className="page-header-icon">🗓</span>
                <div>
                    <h1 className="page-title">Post Scheduler</h1>
                    <p className="page-subtitle">Set a topic once, get AI-generated posts delivered on a recurring schedule.</p>
                </div>
            </div>

            <div className="sch-layout">
                {/* ── Create Form ──────────── */}
                <form className="glass sch-form-card" onSubmit={handleSubmit}>
                    <div className="section-title">New Schedule</div>

                    <div className="form-group">
                        <label className="sp-label" htmlFor="sch-topic">Topic / Prompt</label>
                        <textarea
                            id="sch-topic"
                            className="sp-textarea"
                            placeholder="e.g. Latest developments in renewable energy…"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <span className="sp-label">Tone / Attitude</span>
                        <div className="pill-group">
                            {ATTITUDES.map(({ value, emoji, label }) => (
                                <React.Fragment key={value}>
                                    <input
                                        type="radio"
                                        name="sch-attitude"
                                        id={`sch-att-${value}`}
                                        className="pill-radio"
                                        value={value}
                                        checked={attitude === value}
                                        onChange={() => setAttitude(value)}
                                        disabled={submitting}
                                    />
                                    <label htmlFor={`sch-att-${value}`} className="pill-label">
                                        <span>{emoji}</span> {label}
                                    </label>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="sch-row">
                        <div className="form-group">
                            <label className="sp-label" htmlFor="sch-schedule-at">First Run (local time)</label>
                            <input
                                id="sch-schedule-at"
                                type="datetime-local"
                                className="sp-input"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                disabled={submitting}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="sp-label" htmlFor="sch-interval">Repeat Every</label>
                            <select
                                id="sch-interval"
                                className="sp-select"
                                value={intervalHours}
                                onChange={(e) => setIntervalHours(e.target.value)}
                                disabled={submitting}
                            >
                                {INTERVAL_OPTIONS.map(({ label, value }) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="platform-toggles">
                        <div className="toggle-wrap toggle-option">
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={includeImage}
                                    onChange={(e) => setIncludeImage(e.target.checked)}
                                    disabled={submitting}
                                />
                                <span className="toggle-track" />
                            </label>
                            <span className="toggle-label">
                                Connect AI Image
                            </span>
                        </div>

                        <div className="toggle-wrap toggle-option">
                            <label className="toggle toggle-li">
                                <input
                                    type="checkbox"
                                    checked={publishLinkedIn}
                                    onChange={(e) => linkedinStatus.connected ? setPublishLinkedIn(e.target.checked) : alert('Please connect LinkedIn first via the LinkedIn tab.')}
                                    disabled={submitting}
                                />
                                <span className="toggle-track" />
                            </label>
                            <span className="toggle-label">
                                🔵 Auto-publish LinkedIn
                                {!linkedinStatus.connected && <small>(not connected)</small>}
                            </span>
                        </div>
                    </div>

                    {error && <div className="banner banner-error">{error}</div>}
                    {success && <div className="banner banner-success">{success}</div>}

                    <button type="submit" className="btn btn-primary btn-full" disabled={submitting || !topic.trim()}>
                        {submitting ? <span className="spinner" /> : '🗓 Schedule Post Generator'}
                    </button>
                </form>

                {/* ── Active Schedules ───────── */}
                <div className="sch-list-container">
                    <div className="section-title">Active Schedules ({tasks.length})</div>

                    {loadingTasks ? (
                        <div className="sch-tasks-list">
                            <div className="skeleton" style={{ height: 110 }} />
                            <div className="skeleton" style={{ height: 110 }} />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="glass sch-empty">
                            <span className="sch-empty-icon">📭</span>
                            <p>No active schedules yet. Create one to automate your posts!</p>
                        </div>
                    ) : (
                        <div className="sch-tasks-list">
                            {tasks.map((task) => (
                                <div className="glass task-card" key={task.id}>
                                    <div className="task-side task-side-active" />
                                    <div className="task-body">
                                        <div className="task-topic" title={task.topic}>{task.topic}</div>
                                        <div className="task-meta">
                                            <span className="chip chip-blue">🕒 Next: {formatDate(task.nextExecution)}</span>
                                            <span className="chip chip-default">🔁 Every {task.intervalHours}h</span>
                                            {task.publishLinkedIn && <span className="chip chip-default" style={{ borderColor: 'var(--primary-light)', color: 'var(--primary-light)' }}>🔵 LinkedIn</span>}
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-danger btn-sm task-cancel-btn"
                                        onClick={() => handleCancel(task.id)}
                                        title="Cancel Schedule"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
