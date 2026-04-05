import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './LinkedIn.css';

const API = 'http://localhost:4000/api/linkedin';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

export default function LinkedIn() {
  const [status, setStatus] = useState({ connected: false, name: null });
  const [posts, setPosts] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState('');
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 3000;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const { data } = await axios.get(`${API}/status`, { headers: authHeaders() });
      setStatus(data);
    } catch {
      setStatus({ connected: false, name: null });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const { data } = await axios.get(`${API}/posts`, { headers: authHeaders() });
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      showToast('✅ LinkedIn account connected!');
      window.history.replaceState({}, '', '/linkedin');
    }
    if (params.get('error')) {
      showToast(`❌ Connection failed: ${params.get('error')}`);
      window.history.replaceState({}, '', '/linkedin');
    }
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status.connected) fetchPosts();
    else setPosts([]);
  }, [status.connected, fetchPosts]);

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    if (!token) return showToast('❌ You must be logged in to connect LinkedIn.');
    window.location.href = `${API}/login?token=${encodeURIComponent(token)}`;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your LinkedIn account? Your posts will remain on LinkedIn.')) return;
    try {
      setDisconnecting(true);
      await axios.delete(`${API}/disconnect`, { headers: authHeaders() });
      setStatus({ connected: false, name: null });
      setPosts([]);
      showToast('LinkedIn account disconnected.');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Failed to disconnect'));
    } finally {
      setDisconnecting(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setPostError('');
    if (!text.trim()) return;
    try {
      setPosting(true);
      await axios.post(`${API}/post`, { text: text.trim() }, { headers: authHeaders() });
      setText('');
      setCharCount(0);
      fetchPosts();
      showToast('🔵 Post published to LinkedIn!');
    } catch (err) {
      setPostError(err.response?.data?.message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (post) => { setEditingId(post.id); setEditText(post.content || ''); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (postId) => {
    if (!editText.trim()) return;
    try {
      setSavingEdit(true);
      await axios.patch(`${API}/post/${postId}`, { text: editText.trim() }, { headers: authHeaders() });
      showToast('✏️ Post updated!');
      setEditingId(null);
      setEditText('');
      fetchPosts();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Failed to edit'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post from LinkedIn?')) return;
    try {
      await axios.delete(`${API}/post/${postId}`, { headers: authHeaders() });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('🗑️ Post deleted.');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Failed to delete'));
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const initials = (name) => name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'LI';

  return (
    <div className="content-container social-container">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <div className="social-logo li-logo">
          <svg viewBox="0 0 34 34" aria-hidden="true" width="40" height="40">
            <rect width="34" height="34" rx="6" fill="#0077B5" />
            <path d="M7 12h4v14H7zm2-6a2 2 0 110 4 2 2 0 010-4zm6 6h4v2h.06c.56-1.06 1.93-2.18 3.97-2.18C26.9 11.82 27 14.93 27 17.6V26h-4v-7.63c0-1.82-.03-4.16-2.54-4.16-2.54 0-2.93 1.98-2.93 4.03V26h-4V12z" fill="#fff" />
          </svg>
        </div>
        <div>
          <h1 className="page-title">LinkedIn</h1>
          <p className="page-subtitle">Publish professional posts to your LinkedIn network</p>
        </div>
      </div>

      <div className="social-layout">
        {/* Account Panel */}
        <div className="glass account-card">
          <div className="section-title">Account</div>
          {loadingStatus ? (
            <div className="skeleton" style={{ height: 56, borderRadius: 12 }} />
          ) : status.connected ? (
            <div className="account-row connected">
              <div className="account-avatar li-avatar">{initials(status.name)}</div>
              <div className="account-info">
                <span className="account-name">{status.name || 'LinkedIn User'}</span>
                <span className="account-badge connected-badge">● Connected</span>
              </div>
              <button className="btn btn-danger btn-sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="account-row disconnected">
              <div className="account-avatar disconnected-avatar">in</div>
              <div className="account-info">
                <span className="account-name">No account linked</span>
                <span className="account-badge disconnected-badge">● Disconnected</span>
              </div>
              <button className="btn btn-primary" onClick={handleConnect}>
                Connect LinkedIn
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        {status.connected && (
          <div className="glass composer-card">
            <div className="section-title">Create a Post</div>
            <form onSubmit={handlePost}>
              <div className="form-group">
                <div className="textarea-wrap">
                  <textarea
                    className="sp-textarea"
                    placeholder="Share an insight, update, or idea with your network…"
                    value={text}
                    onChange={(e) => { setText(e.target.value); setCharCount(e.target.value.length); }}
                    disabled={posting}
                    rows={5}
                    maxLength={MAX_CHARS}
                    required
                  />
                  <div className="char-progress">
                    <div className="char-bar" style={{ width: `${Math.min((charCount / MAX_CHARS) * 100, 100)}%`, background: charCount > MAX_CHARS * 0.9 ? 'var(--danger)' : '#0077b5' }} />
                  </div>
                  <div className={`char-count ${charCount > MAX_CHARS * 0.9 ? 'char-warn' : ''}`}>
                    {charCount} / {MAX_CHARS}
                  </div>
                </div>
              </div>
              {postError && <div className="banner banner-error" style={{ marginTop: 12 }}>⚠️ {postError}</div>}
              <button type="submit" className="btn btn-primary li-post-btn" disabled={posting || !text.trim()}>
                {posting ? <span className="spinner" /> : '🔵 Publish to LinkedIn'}
              </button>
            </form>
          </div>
        )}

        {/* Posts */}
        {status.connected && (
          <div className="posts-container">
            <div className="section-title-row">
              <div className="section-title" style={{ margin: 0 }}>My Posts</div>
              <div className="posts-count-badge">{posts.length}</div>
            </div>

            {loadingPosts ? (
              <div className="posts-list">
                <div className="skeleton" style={{ height: 120 }} />
                <div className="skeleton" style={{ height: 120 }} />
              </div>
            ) : posts.length === 0 ? (
              <div className="glass empty-state">
                <span className="empty-icon">💼</span>
                <p>No posts yet. Share something with your network above!</p>
              </div>
            ) : (
              <div className="posts-list">
                {posts.map((post) => {
                  const isEditing = editingId === post.id;
                  return (
                    <div key={post.id} className="glass post-card">
                      <div className="post-header">
                        <div className="post-author">
                          <div className="post-author-avatar li-avatar">{initials(status.name)}</div>
                          <div>
                            <div className="post-author-name">{status.name}</div>
                            <div className="post-date">{formatDate(post.createdAt)}</div>
                          </div>
                        </div>
                        {!isEditing && (
                          <div className="post-actions-top">
                            <button className="icon-btn" onClick={() => startEdit(post)} title="Edit">✏️</button>
                            <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(post.id)} title="Delete">🗑️</button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="post-edit-area">
                          <textarea
                            className="sp-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            autoFocus
                            maxLength={MAX_CHARS}
                          />
                          <div className="post-edit-btns">
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(post.id)} disabled={savingEdit || !editText.trim()}>
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="post-body">{post.content}</div>
                      )}

                      <div className="post-footer">
                        <span className={`chip post-status chip-default`}>{post.status}</span>
                        {post.externalPostId && (
                          <a href={`https://www.linkedin.com/feed/update/${post.externalPostId}`} target="_blank" rel="noopener noreferrer" className="post-link">
                            View on LinkedIn ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
