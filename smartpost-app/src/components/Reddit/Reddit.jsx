import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../LinkedIn/LinkedIn.css'; // Shares social layout styles

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

  const [subreddit, setSubreddit] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const { data } = await axios.get(`${API}/status`, { headers: authHeaders() });
      setStatus(data);
    } catch {
      setStatus({ connected: false, username: null });
    } finally { setLoadingStatus(false); }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const { data } = await axios.get(`${API}/posts`, { headers: authHeaders() });
      setPosts(data.posts || []);
    } catch { setPosts([]); } finally { setLoadingPosts(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') { showToast('✅ Reddit account connected!'); window.history.replaceState({}, '', '/reddit'); }
    if (params.get('error')) { showToast(`❌ Connection failed: ${params.get('error')}`); window.history.replaceState({}, '', '/reddit'); }
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status.connected) fetchPosts(); else setPosts([]);
  }, [status.connected, fetchPosts]);

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    if (!token) return showToast('❌ You must be logged in to connect Reddit.');
    window.location.href = `${API}/login?token=${encodeURIComponent(token)}`;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Reddit account?')) return;
    try {
      setDisconnecting(true);
      await axios.delete(`${API}/disconnect`, { headers: authHeaders() });
      setStatus({ connected: false, username: null });
      setPosts([]);
      showToast('Reddit account disconnected.');
    } catch (err) { showToast('❌ Failed to disconnect'); } finally { setDisconnecting(false); }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setPostError(''); setPostSuccess('');
    if (!subreddit.trim() || !title.trim()) return;

    try {
      setPosting(true);
      await axios.post(`${API}/post`, { subreddit: subreddit.trim(), title: title.trim(), text: body.trim() }, { headers: authHeaders() });
      setPostSuccess(`Posted successfully!`);
      setTimeout(() => setPostSuccess(''), 4000);
      setSubreddit(''); setTitle(''); setBody('');
      fetchPosts();
      showToast('🟠 Post submitted to Reddit!');
    } catch (err) {
      setPostError(err.response?.data?.message || 'Failed to post.');
    } finally { setPosting(false); }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    const parts = post.content?.split('\n\n') || [];
    setEditText(parts.length > 1 ? parts.slice(1).join('\n\n') : post.content || '');
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (postId) => {
    if (!editText.trim()) return;
    try {
      setSavingEdit(true);
      await axios.patch(`${API}/post/${postId}`, { text: editText.trim() }, { headers: authHeaders() });
      showToast('✏️ Post updated!');
      setEditingId(null); setEditText('');
      fetchPosts();
    } catch (err) { showToast('❌ Failed to edit'); } finally { setSavingEdit(false); }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post from Reddit?')) return;
    try {
      await axios.delete(`${API}/post/${postId}`, { headers: authHeaders() });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('🗑️ Post deleted.');
    } catch (err) { showToast('❌ Failed to delete'); }
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="content-container social-container">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <div className="social-logo reddit-logo">
          <svg viewBox="0 0 20 20" aria-hidden="true" width="40" height="40">
            <circle cx="10" cy="10" r="10" fill="#ff4500" />
            <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.6-1.58zM7.27 11a1 1 0 111 1 1 1 0 01-1-1zm5.58 2.71a3.58 3.58 0 01-2.85.86 3.58 3.58 0 01-2.85-.86.27.27 0 01.38-.38 3.07 3.07 0 002.47.66 3.07 3.07 0 002.47-.66.27.27 0 01.38.38zm-.16-1.71a1 1 0 111-1 1 1 0 01-1 1z" fill="#fff" />
          </svg>
        </div>
        <div>
          <h1 className="page-title">Reddit</h1>
          <p className="page-subtitle">Manage your Reddit presence from Smartpost</p>
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
              <div className="account-avatar reddit-avatar">{status.username?.[0]?.toUpperCase() || 'R'}</div>
              <div className="account-info">
                <span className="account-name">u/{status.username}</span>
                <span className="account-badge connected-badge">● Connected</span>
              </div>
              <button className="btn btn-danger btn-sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <div className="account-row disconnected">
              <div className="account-avatar disconnected-avatar">?</div>
              <div className="account-info">
                <span className="account-name">No account linked</span>
                <span className="account-badge disconnected-badge">● Disconnected</span>
              </div>
              <button className="btn btn-primary" onClick={handleConnect} style={{ background: '#ff4500' }}>
                Connect Reddit
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        {status.connected && (
          <div className="glass composer-card">
            <div className="section-title">Create a Post</div>
            <form onSubmit={handlePost}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="sp-label">Subreddit</label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">r/</span>
                    <input
                      className="sp-input prefixed-input"
                      placeholder="e.g. startup"
                      value={subreddit}
                      onChange={(e) => setSubreddit(e.target.value)}
                      disabled={posting}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="sp-label">Title</label>
                  <input
                    className="sp-input"
                    placeholder="Post title…"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={posting}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="sp-label">Body (optional)</label>
                <textarea
                  className="sp-textarea"
                  placeholder="Post body text…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={posting}
                  rows={4}
                />
              </div>

              {postError && <div className="banner banner-error" style={{ marginTop: 16 }}>⚠️ {postError}</div>}
              {postSuccess && <div className="banner banner-success" style={{ marginTop: 16 }}>✅ {postSuccess}</div>}

              <button type="submit" className="btn btn-primary reddit-post-btn" style={{ background: '#ff4500' }} disabled={posting || !subreddit.trim() || !title.trim()}>
                {posting ? <span className="spinner" /> : '🟠 Post to Reddit'}
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
                <span className="empty-icon">📭</span>
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
                    <div key={post.id} className="glass post-card">
                      <div className="post-header">
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{postTitle}</h3>
                          <div className="post-date">{formatDate(post.createdAt)}</div>
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
                          />
                          <div className="post-edit-btns">
                            <button className="btn btn-primary btn-sm" style={{ background: '#ff4500' }} onClick={() => saveEdit(post.id)} disabled={savingEdit || !editText.trim()}>
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                         postBody && <div className="post-body">{postBody}</div>
                      )}

                      <div className="post-footer">
                        <span className={`chip post-status chip-default`}>{post.status}</span>
                        {post.externalPostId && (
                          <a href={`https://reddit.com/comments/${post.externalPostId}`} target="_blank" rel="noopener noreferrer" className="post-link" style={{ color: '#ff4500' }}>
                            View on Reddit ↗
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
