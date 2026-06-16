import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Archive, Trash2, ClipboardCopy, CheckCircle, Send, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import './Drafts.css';

const API = `${import.meta.env.VITE_API_URL}/api`;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

export default function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [linkedinStatus, setLinkedinStatus] = useState({ connected: false });
  const [publishingId, setPublishingId] = useState(null);
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/drafts`, { headers: authHeaders() });
      setDrafts(data);
    } catch (err) {
      setError('Failed to load drafts.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLinkedinStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/linkedin/status`, { headers: authHeaders() });
      setLinkedinStatus(data);
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchDrafts();
    fetchLinkedinStatus();
  }, [fetchDrafts, fetchLinkedinStatus]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await axios.delete(`${API}/drafts/${deleteConfirmId}`, { headers: authHeaders() });
      setDrafts((prev) => prev.filter((d) => d.id !== deleteConfirmId));
      showToast('Draft deleted.');
    } catch (err) {
      showToast(err.response?.data?.message || '❌ Failed to delete draft');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handlePublish = async (draft) => {
    if (!linkedinStatus.connected) {
      showToast('❌ You must connect LinkedIn first.');
      return;
    }
    setPublishingId(draft.id);
    try {
      await axios.post(`${API}/linkedin/post`, { text: draft.content }, { headers: authHeaders() });
      showToast(<><Send size={14} /> Published to LinkedIn!</>);
    } catch (err) {
      showToast('❌ Failed to publish post');
    } finally {
      setPublishingId(null);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="content-container drafts-container">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <span className="page-header-icon"><Archive size={28} /></span>
        <div>
          <h1 className="page-title">Drafts & History</h1>
          <p className="page-subtitle">Review your past generated posts, copy them, or publish to your networks.</p>
        </div>
      </div>

      <div className="drafts-layout">
        {deleteConfirmId && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass" style={{ padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', backgroundColor: 'var(--bg-glass)' }}>
              <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}>Delete Draft</h3>
              <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Are you sure you want to delete this draft permanently? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={cancelDelete}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="section-title-row">
          <div className="section-title" style={{ margin: 0 }}>Saved Drafts</div>
          <div className="posts-count-badge">{drafts.length}</div>
        </div>

        {loading ? (
          <div className="drafts-list">
            <div className="skeleton" style={{ height: 150 }} />
            <div className="skeleton" style={{ height: 150 }} />
          </div>
        ) : error ? (
          <div className="banner banner-error">{error}</div>
        ) : drafts.length === 0 ? (
          <div className="glass empty-state">
            <span className="empty-icon"><Archive size={32} /></span>
            <p>No drafts yet. Go to the Generator to create your first post!</p>
            <Link to="/generate" className="btn btn-primary" style={{ marginTop: 16 }}>
              Go to Generator
            </Link>
          </div>
        ) : (
          <div className="drafts-list">
            {drafts.map((draft) => (
              <div key={draft.id} className="glass draft-card">
                <div className="draft-header">
                  <div className="draft-topic">
                    <strong>Topic:</strong> {draft.topic || 'Untitled'}
                  </div>
                  <div className="draft-date">{formatDate(draft.createdAt)}</div>
                </div>

                <div className="draft-body">
                  <div className="draft-content">{draft.content}</div>
                  {draft.imageUrl && (
                    <div className="draft-image-wrap">
                      <img src={`${import.meta.env.VITE_API_URL}${draft.imageUrl}`} alt="AI Generated" className="draft-image" />
                    </div>
                  )}
                </div>

                <div className="draft-footer">
                  <div className="draft-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(draft.id, draft.content)}>
                      {copiedId === draft.id ? <><CheckCircle size={14} /> Copied!</> : <><ClipboardCopy size={14} /> Copy</>}
                    </button>
                    {linkedinStatus.connected && (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handlePublish(draft)}
                        disabled={publishingId === draft.id}
                      >
                        {publishingId === draft.id ? 'Publishing...' : <><Send size={14} /> Publish to LinkedIn</>}
                      </button>
                    )}
                  </div>
                  <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(draft.id)} title="Delete Draft">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
