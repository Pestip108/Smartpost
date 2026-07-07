import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Archive, Trash2, ClipboardCopy, CheckCircle, Send, Image as ImageIcon, AlertTriangle, Search, Filter } from 'lucide-react';
import './History.css';

const API = `${import.meta.env.VITE_API_URL}/api`;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [linkedinStatus, setLinkedinStatus] = useState({ connected: false });
  const [publishingId, setPublishingId] = useState(null);
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'draft', 'posted'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/history`, { headers: authHeaders() });
      setItems(data);
    } catch (err) {
      setError('Failed to load history.');
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
    fetchHistory();
    fetchLinkedinStatus();
  }, [fetchHistory, fetchLinkedinStatus]);

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
      await axios.delete(`${API}/history/${deleteConfirmId}`, { headers: authHeaders() });
      setItems((prev) => prev.filter((d) => d.id !== deleteConfirmId));
      showToast('Item deleted.');
    } catch (err) {
      showToast(err.response?.data?.message || '❌ Failed to delete item');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handlePublish = async (item) => {
    if (!linkedinStatus.connected) {
      showToast('❌ You must connect LinkedIn first.');
      return;
    }
    setPublishingId(item.id);
    try {
      const payload = { text: item.content };
      if (item.imageUrl) {
        payload.imageUrl = item.imageUrl;
      }
      await axios.post(`${API}/linkedin/post`, payload, { headers: authHeaders() });
      showToast(<><Send size={14} /> Published to LinkedIn!</>);
    } catch (err) {
      showToast('❌ Failed to publish post');
    } finally {
      setPublishingId(null);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Apply filters, sorting, and search
  const displayedItems = items
    .filter(item => {
      if (filterType === 'draft') return item.status === 'draft';
      if (filterType === 'posted') return item.status === 'posted';
      return true;
    })
    .filter(item => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const matchTopic = item.topic && item.topic.toLowerCase().includes(query);
      const matchContent = item.content && item.content.toLowerCase().includes(query);
      return matchTopic || matchContent;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="content-container drafts-container">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <span className="page-header-icon"><Archive size={28} /></span>
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Review your past generated posts, drafts, copy them, or publish to your networks.</p>
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
              <h3 style={{ marginBottom: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}>Delete Item</h3>
              <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Are you sure you want to delete this permanently? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={cancelDelete}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="glass controls-bar">
          <div className="controls-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sp-input search-input"
            />
          </div>
          <div className="controls-filters">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="sp-input select-filter"
            >
              <option value="all">All Items</option>
              <option value="draft">Drafts</option>
              <option value="posted">Posted</option>
            </select>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className="sp-input select-filter"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="section-title-row" style={{ marginTop: '24px' }}>
          <div className="section-title" style={{ margin: 0 }}>Results</div>
          <div className="posts-count-badge">{displayedItems.length}</div>
        </div>

        {loading ? (
          <div className="drafts-list">
            <div className="skeleton" style={{ height: 150 }} />
            <div className="skeleton" style={{ height: 150 }} />
          </div>
        ) : error ? (
          <div className="banner banner-error">{error}</div>
        ) : displayedItems.length === 0 ? (
          <div className="glass empty-state">
            <span className="empty-icon"><Archive size={32} /></span>
            <p>No items found. {searchQuery ? 'Try adjusting your search.' : 'Go to the Generator to create your first post!'}</p>
            {!searchQuery && (
              <Link to="/generate" className="btn btn-primary" style={{ marginTop: 16 }}>
                Go to Generator
              </Link>
            )}
          </div>
        ) : (
          <div className="drafts-list">
            {displayedItems.map((item) => (
              <div key={item.id} className="glass draft-card">
                <div className="draft-header">
                  <div className="draft-topic">
                    {item.topic ? (
                      <><strong>Topic:</strong> {item.topic}</>
                    ) : item.platform ? (
                      <><strong>Platform:</strong> <span style={{textTransform: 'capitalize'}}>{item.platform}</span></>
                    ) : (
                      <strong>Generated Post</strong>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.status === 'posted' && <span className="chip chip-blue">Posted</span>}
                    {item.status === 'draft' && <span className="chip chip-default">Draft</span>}
                    {item.status === 'scheduled' && <span className="chip chip-blue">Scheduled</span>}
                    <div className="draft-date">{formatDate(item.createdAt)}</div>
                  </div>
                </div>

                <div className="draft-body">
                  <div className="draft-content">{item.content}</div>
                  {item.imageUrl && (
                    <div className="draft-image-wrap">
                      <img src={`${import.meta.env.VITE_API_URL}${item.imageUrl}`} alt="AI Generated" className="draft-image" />
                    </div>
                  )}
                </div>

                <div className="draft-footer">
                  <div className="draft-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(item.id, item.content)}>
                      {copiedId === item.id ? <><CheckCircle size={14} /> Copied!</> : <><ClipboardCopy size={14} /> Copy</>}
                    </button>
                    {item.status === 'draft' && linkedinStatus.connected && (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handlePublish(item)}
                        disabled={publishingId === item.id}
                      >
                        {publishingId === item.id ? 'Publishing...' : <><Send size={14} /> Publish to LinkedIn</>}
                      </button>
                    )}
                    {item.status === 'posted' && item.externalPostId && (
                      <a href={`https://www.linkedin.com/feed/update/${item.externalPostId}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                        View on LinkedIn ↗
                      </a>
                    )}
                  </div>
                  <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(item.id)} title="Delete Item">
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
