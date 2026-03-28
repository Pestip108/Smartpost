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
    // ── Form state ──
    const [topic, setTopic] = useState('');
    const [attitude, setAttitude] = useState('Neutral');
    const [includeImage, setIncludeImage] = useState(false);
    const [intervalHours, setIntervalHours] = useState(24);
    const [scheduledAt, setScheduledAt] = useState('');

    // ── UI state ──
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ── Tasks list ──
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // Pre-fill scheduledAt with ~1 hour from now
    useEffect(() => {
        const d = new Date(Date.now());
        // Local ISO-formatted string for datetime-local input
        const pad = (n) => String(n).padStart(2, '0');
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setScheduledAt(local);
    }, []);

    const fetchTasks = async () => {
        setLoadingTasks(true);
        try {
            const { data } = await axios.get(API_URL, { headers: authHeaders() });
            setTasks(data);
        } catch {
            // silently ignore
        } finally {
            setLoadingTasks(false);
        }
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
        <div className="scheduler-container">
            {/* Background blobs */}
            <div className="sch-blob sch-blob-1" />
            <div className="sch-blob sch-blob-2" />
            <div className="sch-blob sch-blob-3" />

            <div className="scheduler-content">
                <Link to="/" className="sch-back">← Back to Dashboard</Link>

                {/* Header */}
                <div className="sch-header">
                    <h1>🗓️ Post Scheduler</h1>
                    <p>Set a topic once, get AI-generated posts delivered on a recurring schedule.</p>
                </div>

                {/* ── Create form ── */}
                <form className="sch-card" onSubmit={handleSubmit}>
                    {/* Topic */}
                    <div>
                        <label className="sch-label" htmlFor="sch-topic">Topic / Prompt</label>
                        <textarea
                            id="sch-topic"
                            className="sch-textarea"
                            placeholder="e.g. Latest developments in renewable energy…"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    {/* Tone */}
                    <div>
                        <span className="sch-label">Tone / Attitude</span>
                        <div className="attitude-group">
                            {ATTITUDES.map(({ value, emoji, label }) => (
                                <React.Fragment key={value}>
                                    <input
                                        type="radio"
                                        name="sch-attitude"
                                        id={`sch-att-${value}`}
                                        className="attitude-option"
                                        value={value}
                                        checked={attitude === value}
                                        onChange={() => setAttitude(value)}
                                        disabled={submitting}
                                    />
                                    <label htmlFor={`sch-att-${value}`} className="attitude-label">
                                        <span>{emoji}</span>{label}
                                    </label>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* First run + interval */}
                    <div className="sch-row">
                        <div>
                            <label className="sch-label" htmlFor="sch-schedule-at">First Run (local time)</label>
                            <input
                                id="sch-schedule-at"
                                type="datetime-local"
                                className="sch-input"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                disabled={submitting}
                                required
                            />
                        </div>
                        <div>
                            <label className="sch-label" htmlFor="sch-interval">Repeat Every</label>
                            <select
                                id="sch-interval"
                                className="sch-input sch-select"
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

                    {/* Include image toggle */}
                    <div className="toggle-row">
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={includeImage}
                                onChange={(e) => setIncludeImage(e.target.checked)}
                                disabled={submitting}
                            />
                            <span className="toggle-slider" />
                        </label>
                        <span className="toggle-text">
                            Include AI-generated image
                            <span>· slightly longer processing</span>
                        </span>
                    </div>

                    {error && <div className="sch-error">⚠️ {error}</div>}
                    {success && <div className="sch-success">{success}</div>}

                    <button type="submit" className="sch-btn" disabled={submitting || !topic.trim()}>
                        {submitting ? (
                            <><span className="sch-spinner" /> Scheduling…</>
                        ) : (
                            <>🗓️ Schedule Posts</>
                        )}
                    </button>
                </form>

                {/* ── Active schedules ── */}
                <div className="tasks-section">
                    <h2>Active Schedules</h2>

                    {loadingTasks ? (
                        <div className="tasks-empty">Loading…</div>
                    ) : tasks.length === 0 ? (
                        <div className="tasks-empty">No active schedules yet. Create one above!</div>
                    ) : (
                        <div className="tasks-list">
                            {tasks.map((task) => (
                                <div className="task-card" key={task.id}>
                                    <div className="task-icon">🗓️</div>
                                    <div className="task-info">
                                        <p className="task-topic">{task.topic}</p>
                                        <div className="task-meta">
                                            <span className="task-badge blue">
                                                🕒 Next: {formatDate(task.nextExecution)}
                                            </span>
                                            <span className="task-badge">
                                                🔁 Every {task.intervalHours}h
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className="task-cancel-btn"
                                        onClick={() => handleCancel(task.id)}
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
