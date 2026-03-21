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

  // Composer
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // UI
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
    if (!token) {
      showToast('❌ You must be logged in to connect LinkedIn.');
      return;
    }
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
      await axios.post(
        `${API}/post`,
        { text: text.trim() },
        { headers: authHeaders() }
      );
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

  const handleTextChange = (e) => {
    setText(e.target.value);
    setCharCount(e.target.value.length);
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditText(post.content || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (postId) => {
    if (!editText.trim()) return;
    try {
      setSavingEdit(true);
      await axios.patch(
        `${API}/post/${postId}`,
        { text: editText.trim() },
        { headers: authHeaders() }
      );
      showToast('✏️ Post updated!');
      setEditingId(null);
      setEditText('');
      fetchPosts();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Failed to edit post'));
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
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const initials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'LI';

  return (
    <div className="li-page">
      <div className="li-blob li-blob-1" />
      <div className="li-blob li-blob-2" />
      <div className="li-blob li-blob-3" />

      {toast && <div className="li-toast">{toast}</div>}

      <div className="li-content">
        {/* Header */}
        <div className="li-header">
          <div className="li-logo">
            <svg viewBox="0 0 34 34" aria-hidden="true" className="li-icon">
              <rect width="34" height="34" rx="6" fill="#0077B5" />
              <path
                d="M7 12h4v14H7zm2-6a2 2 0 110 4 2 2 0 010-4zm6 6h4v2h.06c.56-1.06 1.93-2.18 3.97-2.18C26.9 11.82 27 14.93 27 17.6V26h-4v-7.63c0-1.82-.03-4.16-2.54-4.16-2.54 0-2.93 1.98-2.93 4.03V26h-4V12z"
                fill="#fff"
              />
            </svg>
          </div>
          <div>
            <h1 className="li-title">LinkedIn</h1>
            <p className="li-subtitle">Publish professional posts to your LinkedIn network</p>
          </div>
        </div>

        {/* Account Panel */}
        <div className="li-card account-card">
          <div className="card-section-title">Account</div>
          {loadingStatus ? (
            <div className="li-skeleton" style={{ height: 48, borderRadius: 12 }} />
          ) : status.connected ? (
            <div className="account-row">
              <div className="account-avatar">
                {initials(status.name)}
              </div>
              <div className="account-info">
                <span className="account-name">{status.name || 'LinkedIn User'}</span>
                <span className="account-badge connected-badge">● Connected</span>
              </div>
              <button
                className="li-btn li-btn-danger"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="account-row account-row-disconnected">
              <div className="account-avatar disconnected-avatar">in</div>
              <div className="account-info">
                <span className="account-name">No LinkedIn account linked</span>
                <span className="account-badge disconnected-badge">● Disconnected</span>
              </div>
              <button className="li-btn li-btn-primary connect-btn" onClick={handleConnect}>
                <svg viewBox="0 0 34 34" className="btn-li-icon" aria-hidden="true">
                  <rect width="34" height="34" rx="6" fill="currentColor" opacity="0.25" />
                  <path d="M7 12h4v14H7zm2-6a2 2 0 110 4 2 2 0 010-4zm6 6h4v2h.06c.56-1.06 1.93-2.18 3.97-2.18C26.9 11.82 27 14.93 27 17.6V26h-4v-7.63c0-1.82-.03-4.16-2.54-4.16-2.54 0-2.93 1.98-2.93 4.03V26h-4V12z" fill="currentColor" />
                </svg>
                Connect LinkedIn
              </button>
            </div>
          )}
        </div>

        {/* Post Composer */}
        {status.connected && (
          <div className="li-card composer-card">
            <div className="card-section-title">Create a Post</div>
            <form onSubmit={handlePost} className="composer-form">
              <div className="composer-field">
                <label className="li-label" htmlFor="li-post-text">
                  What do you want to share?
                </label>
                <div className="textarea-wrap">
                  <textarea
                    id="li-post-text"
                    className="li-textarea"
                    placeholder="Share an insight, update, or idea with your network…"
                    value={text}
                    onChange={handleTextChange}
                    disabled={posting}
                    rows={6}
                    maxLength={MAX_CHARS}
                    required
                  />
                  <div className={`char-counter ${charCount > MAX_CHARS * 0.9 ? 'char-warn' : ''}`}>
                    {charCount}/{MAX_CHARS}
                  </div>
                </div>
              </div>

              {postError && <div className="li-error">⚠️ {postError}</div>}

              <button
                type="submit"
                className="li-btn li-btn-primary submit-post-btn"
                disabled={posting || !text.trim()}
              >
                {posting ? (
                  <><span className="li-spinner" /> Publishing…</>
                ) : (
                  '🔵 Publish to LinkedIn'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Posts List */}
        {status.connected && (
          <div className="li-card posts-card">
            <div className="card-section-title">
              My Posts
              <span className="posts-count">{posts.length}</span>
            </div>

            {loadingPosts ? (
              <div className="posts-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="post-skeleton">
                    <div className="li-skeleton" style={{ height: 16, width: '70%' }} />
                    <div className="li-skeleton" style={{ height: 13, width: '50%', marginTop: 8 }} />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="posts-empty">
                <span className="posts-empty-icon">💼</span>
                <p>No posts yet. Share something with your network above!</p>
              </div>
            ) : (
              <div className="posts-list">
                {posts.map((post) => {
                  const isEditing = editingId === post.id;
                  return (
                    <div key={post.id} className={`post-item${isEditing ? ' editing' : ''}`}>
                      <div className="post-top">
                        <div className="post-author-row">
                          <div className="post-avatar">{initials(status.name)}</div>
                          <div>
                            <div className="post-author-name">{status.name}</div>
                            <div className="post-date">{formatDate(post.createdAt)}</div>
                          </div>
                        </div>
                        <div className="post-actions">
                          {!isEditing && (
                            <>
                              <button className="icon-btn edit-btn" onClick={() => startEdit(post)} title="Edit post">✏️</button>
                              <button className="icon-btn delete-btn" onClick={() => handleDelete(post.id)} title="Delete post">🗑️</button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="edit-area">
                          <textarea
                            className="li-textarea edit-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={5}
                            autoFocus
                            maxLength={MAX_CHARS}
                          />
                          <div className="edit-btns">
                            <button
                              className="li-btn li-btn-primary small-btn"
                              onClick={() => saveEdit(post.id)}
                              disabled={savingEdit || !editText.trim()}
                            >
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              className="li-btn li-btn-ghost small-btn"
                              onClick={cancelEdit}
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="post-body">{post.content}</p>
                      )}

                      <div className="post-meta">
                        <span className={`status-chip status-${post.status}`}>{post.status}</span>
                        {post.externalPostId && (
                          <a
                            href={`https://www.linkedin.com/feed/update/${post.externalPostId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="li-link"
                          >
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
