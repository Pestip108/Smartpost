import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Reddit.css';

const API = 'http://localhost:4000/api/reddit';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

export default function Reddit() {
  const [status, setStatus] = useState({ connected: false, username: null });
  const [posts, setPosts] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Composer state
  const [subreddit, setSubreddit] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Disconnect
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState('');

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
      setStatus({ connected: false, username: null });
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
    // Check if we're returning from Reddit OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      showToast('✅ Reddit account connected!');
      window.history.replaceState({}, '', '/reddit');
    }
    if (params.get('error')) {
      showToast(`❌ Connection failed: ${params.get('error')}`);
      window.history.replaceState({}, '', '/reddit');
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
      showToast('❌ You must be logged in to connect Reddit.');
      return;
    }
    // Pass JWT as query param — the backend authenticate middleware reads it
    // for browser-redirect flows where Authorization headers can't be set.
    window.location.href = `${API}/login?token=${encodeURIComponent(token)}`;
  };


  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Reddit account? Your posts will remain on Reddit.')) return;
    try {
      setDisconnecting(true);
      await axios.delete(`${API}/disconnect`, { headers: authHeaders() });
      setStatus({ connected: false, username: null });
      setPosts([]);
      showToast('Reddit account disconnected.');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Failed to disconnect'));
    } finally {
      setDisconnecting(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setPostError('');
    setPostSuccess('');
    if (!subreddit.trim() || !title.trim()) return;

    try {
      setPosting(true);
      const { data } = await axios.post(
        `${API}/post`,
        { subreddit: subreddit.trim(), title: title.trim(), text: body.trim() },
        { headers: authHeaders() }
      );
      setPostSuccess(`Posted! ${data.url ? `→ ${data.url}` : ''}`);
      setSubreddit('');
      setTitle('');
      setBody('');
      fetchPosts();
      showToast('🟠 Post submitted to Reddit!');
    } catch (err) {
      setPostError(err.response?.data?.message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    // Pre-fill with just the body (content is "title\n\nbody")
    const parts = post.content?.split('\n\n') || [];
    setEditText(parts.length > 1 ? parts.slice(1).join('\n\n') : post.content || '');
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
      showToast('✏️ Post updated successfully!');
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
    if (!window.confirm('Delete this post from Reddit?')) return;
    try {
      await axios.delete(`${API}/post/${postId}`, { headers: authHeaders() });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('🗑️ Post deleted.');
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Failed to delete post'));
    }
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="reddit-page">
      {/* Background blobs */}
      <div className="reddit-blob reddit-blob-1" />
      <div className="reddit-blob reddit-blob-2" />
      <div className="reddit-blob reddit-blob-3" />

      {/* Toast */}
      {toast && <div className="reddit-toast">{toast}</div>}

      <div className="reddit-content">
        {/* Header */}
        <div className="reddit-header">
          <div className="reddit-logo">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="reddit-icon">
              <circle cx="10" cy="10" r="10" fill="#ff4500" />
              <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.6-1.58zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.85.86 3.58 3.58 0 01-2.85-.86.27.27 0 01.38-.38 3.07 3.07 0 002.47.66 3.07 3.07 0 002.47-.66.27.27 0 01.38.38zm-.16-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="#fff" />
            </svg>
          </div>
          <div>
            <h1 className="reddit-title">Reddit</h1>
            <p className="reddit-subtitle">Manage your Reddit presence from Smartpost</p>
          </div>
        </div>

        {/* Account Panel */}
        <div className="reddit-card account-card">
          <div className="card-section-title">Account</div>
          {loadingStatus ? (
            <div className="reddit-skeleton" style={{ height: 48, borderRadius: 12 }} />
          ) : status.connected ? (
            <div className="account-row">
              <div className="account-avatar">
                {status.username?.[0]?.toUpperCase() || 'R'}
              </div>
              <div className="account-info">
                <span className="account-name">u/{status.username}</span>
                <span className="account-badge connected-badge">● Connected</span>
              </div>
              <button
                className="reddit-btn reddit-btn-danger"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="account-row account-row-disconnected">
              <div className="account-avatar disconnected-avatar">?</div>
              <div className="account-info">
                <span className="account-name">No Reddit account linked</span>
                <span className="account-badge disconnected-badge">● Disconnected</span>
              </div>
              <button className="reddit-btn reddit-btn-primary connect-btn" onClick={handleConnect}>
                <svg viewBox="0 0 20 20" className="btn-reddit-icon" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.2" />
                  <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.6-1.58zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.85.86 3.58 3.58 0 01-2.85-.86.27.27 0 01.38-.38 3.07 3.07 0 002.47.66 3.07 3.07 0 002.47-.66.27.27 0 01.38.38zm-.16-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="currentColor" />
                </svg>
                Connect Reddit
              </button>
            </div>
          )}
        </div>

        {/* Post Composer */}
        {status.connected && (
          <div className="reddit-card composer-card">
            <div className="card-section-title">Create a Post</div>
            <form onSubmit={handlePost} className="composer-form">
              <div className="composer-row">
                <div className="composer-field half-field">
                  <label className="reddit-label" htmlFor="reddit-subreddit">
                    Subreddit
                  </label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">r/</span>
                    <input
                      id="reddit-subreddit"
                      className="reddit-input prefixed-input"
                      type="text"
                      placeholder="e.g. test"
                      value={subreddit}
                      onChange={(e) => setSubreddit(e.target.value)}
                      disabled={posting}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="composer-field">
                <label className="reddit-label" htmlFor="reddit-title">Title</label>
                <input
                  id="reddit-title"
                  className="reddit-input"
                  type="text"
                  placeholder="Post title…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={posting}
                  required
                />
              </div>

              <div className="composer-field">
                <label className="reddit-label" htmlFor="reddit-body">Body (optional)</label>
                <textarea
                  id="reddit-body"
                  className="reddit-textarea"
                  placeholder="Post body text…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={posting}
                  rows={5}
                />
              </div>

              {postError && <div className="reddit-error">⚠️ {postError}</div>}
              {postSuccess && <div className="reddit-success">✅ {postSuccess}</div>}

              <button
                type="submit"
                className="reddit-btn reddit-btn-primary submit-post-btn"
                disabled={posting || !subreddit.trim() || !title.trim()}
              >
                {posting ? (
                  <><span className="reddit-spinner" /> Posting…</>
                ) : (
                  '🟠 Post to Reddit'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Posts List */}
        {status.connected && (
          <div className="reddit-card posts-card">
            <div className="card-section-title">
              My Posts
              <span className="posts-count">{posts.length}</span>
            </div>

            {loadingPosts ? (
              <div className="posts-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="post-skeleton">
                    <div className="reddit-skeleton" style={{ height: 18, width: '60%' }} />
                    <div className="reddit-skeleton" style={{ height: 14, width: '40%', marginTop: 8 }} />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="posts-empty">
                <span className="posts-empty-icon">📭</span>
                <p>No posts yet. Create your first Reddit post above!</p>
              </div>
            ) : (
              <div className="posts-list">
                {posts.map((post) => {
                  const lines = post.content?.split('\n\n') || [];
                  const postTitle = lines[0] || '(untitled)';
                  const postBody = lines.slice(1).join('\n\n');
                  const isEditing = editingId === post.id;

                  return (
                    <div key={post.id} className={`post-item${isEditing ? ' editing' : ''}`}>
                      <div className="post-top">
                        <h3 className="post-title">{postTitle}</h3>
                        <div className="post-actions">
                          {!isEditing && (
                            <>
                              <button
                                className="icon-btn edit-btn"
                                onClick={() => startEdit(post)}
                                title="Edit post"
                              >
                                ✏️
                              </button>
                              <button
                                className="icon-btn delete-btn"
                                onClick={() => handleDelete(post.id)}
                                title="Delete post"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="edit-area">
                          <textarea
                            className="reddit-textarea edit-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={5}
                            autoFocus
                          />
                          <div className="edit-btns">
                            <button
                              className="reddit-btn reddit-btn-primary small-btn"
                              onClick={() => saveEdit(post.id)}
                              disabled={savingEdit || !editText.trim()}
                            >
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              className="reddit-btn reddit-btn-ghost small-btn"
                              onClick={cancelEdit}
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        postBody && <p className="post-body">{postBody}</p>
                      )}

                      <div className="post-meta">
                        <span className={`status-chip status-${post.status}`}>{post.status}</span>
                        {post.externalPostId && (
                          <a
                            href={`https://reddit.com/comments/${post.externalPostId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="reddit-link"
                          >
                            View on Reddit ↗
                          </a>
                        )}
                        <span className="post-date">{formatDate(post.createdAt)}</span>
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
