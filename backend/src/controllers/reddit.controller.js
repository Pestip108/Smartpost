const axios = require("axios");
const prisma = require("../prisma/client");

const REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/authorize";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_URL = "https://oauth.reddit.com";
const USER_AGENT = "web:smartpost:v1.0 (by /u/smartpost_app)";
const PLATFORM_NAME = "reddit";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Gets (or creates) the Platform row for Reddit.
 */
async function getRedditPlatform() {
  return prisma.platform.upsert({
    where: { platformName: PLATFORM_NAME },
    create: {
      platformName: PLATFORM_NAME,
      apiBaseUrl: REDDIT_API_URL,
      isActive: true,
    },
    update: {},
  });
}

/**
 * Fetches the SocialAccount for the given userId + reddit platform.
 * Returns null if not found.
 */
async function getAccount(userId) {
  const platform = await getRedditPlatform();
  return prisma.socialAccount.findUnique({
    where: {
      unique_user_platform: {
        userId: BigInt(userId),
        platformId: platform.id,
      },
    },
  });
}

/**
 * Refreshes the access token if it's expired (or about to expire within 60s).
 * Updates the DB row and returns the valid access token string.
 */
async function getValidToken(account) {
  const now = new Date();
  const buffer = new Date(now.getTime() + 60 * 1000); // 60s buffer

  if (account.expiresAt && account.expiresAt > buffer) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    throw new Error("No refresh token available. Please reconnect Reddit.");
  }

  const credentials = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", account.refreshToken);

  const response = await axios.post(REDDIT_TOKEN_URL, params, {
    headers: {
      Authorization: `Basic ${credentials}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const { access_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { accessToken: access_token, expiresAt },
  });

  return access_token;
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/reddit/login
 * Builds the Reddit OAuth2 authorization URL and redirects the user.
 * The `state` param carries the user's JWT userId so we can link the account on callback.
 */
const initiateLogin = (req, res) => {
  const userId = req.user.userId;

  const params = new URLSearchParams({
    client_id: process.env.REDDIT_CLIENT_ID,
    response_type: "code",
    state: userId,
    redirect_uri: process.env.REDDIT_REDIRECT_URI,
    duration: "permanent",
    scope: "identity submit edit read",
  });

  res.redirect(`${REDDIT_AUTH_URL}?${params.toString()}`);
};

/**
 * GET /api/reddit/callback
 * Reddit redirects here after the user approves the app.
 * Exchanges the auth code for tokens and stores the SocialAccount in DB.
 */
const callback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173/reddit?error=${error}`);
  }

  if (!code || !state) {
    return res.redirect("http://localhost:5173/reddit?error=missing_params");
  }

  try {
    const credentials = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString("base64");

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.REDDIT_REDIRECT_URI);

    // Exchange code for tokens
    const tokenRes = await axios.post(REDDIT_TOKEN_URL, params, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch Reddit username
    const meRes = await axios.get(`${REDDIT_API_URL}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "User-Agent": USER_AGENT,
      },
    });
    const redditUsername = meRes.data.name;

    const platform = await getRedditPlatform();
    const userId = BigInt(state);

    await prisma.socialAccount.upsert({
      where: {
        unique_user_platform: {
          userId,
          platformId: platform.id,
        },
      },
      create: {
        userId,
        platformId: platform.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        redditUsername,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        redditUsername,
      },
    });

    res.redirect("http://localhost:5173/reddit?connected=true");
  } catch (err) {
    console.error("Reddit callback error:", err.response?.data || err.message);
    res.redirect("http://localhost:5173/reddit?error=token_exchange_failed");
  }
};

/**
 * GET /api/reddit/status
 * Returns whether the current user has a linked Reddit account.
 */
const getStatus = async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.json({ connected: false });
    }
    res.json({ connected: true, username: account.redditUsername });
  } catch (err) {
    console.error("Reddit status error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/reddit/post
 * Body: { subreddit, title, text }
 * Submits a text post to Reddit and saves it to the Post table.
 */
const createPost = async (req, res) => {
  const { subreddit, title, text } = req.body;

  if (!subreddit || !title) {
    return res.status(400).json({ message: "subreddit and title are required" });
  }

  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(403).json({ message: "Reddit account not connected" });
    }

    const token = await getValidToken(account);

    const params = new URLSearchParams();
    params.append("sr", subreddit);
    params.append("kind", "self");
    params.append("title", title);
    params.append("text", text || "");
    params.append("api_type", "json");

    const submitRes = await axios.post(
      `${REDDIT_API_URL}/api/submit`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const submitData = submitRes.data.json;
    if (submitData.errors && submitData.errors.length > 0) {
      return res.status(400).json({ message: submitData.errors[0][1] });
    }

    const postUrl = submitData.data?.url || "";
    const externalPostId = submitData.data?.id || null;

    // Store post in DB
    const dbPost = await prisma.post.create({
      data: {
        socialAccountId: account.id,
        content: `${title}\n\n${text || ""}`.trim(),
        type: "text",
        status: "posted",
        externalPostId,
      },
    });

    res.status(201).json({
      message: "Posted to Reddit successfully",
      postId: dbPost.id.toString(),
      externalPostId,
      url: postUrl,
    });
  } catch (err) {
    console.error("Reddit createPost error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to post to Reddit" });
  }
};

/**
 * PATCH /api/reddit/post/:postId
 * Body: { text }
 * Edits the body of a text post on Reddit and updates the DB.
 */
const editPost = async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "text is required" });
  }

  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(403).json({ message: "Reddit account not connected" });
    }

    // Verify post belongs to this account
    const dbPost = await prisma.post.findFirst({
      where: {
        id: BigInt(postId),
        socialAccountId: account.id,
        deleted: false,
      },
    });

    if (!dbPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!dbPost.externalPostId) {
      return res.status(400).json({ message: "No external Reddit post ID found" });
    }

    const token = await getValidToken(account);

    const params = new URLSearchParams();
    params.append("thing_id", `t3_${dbPost.externalPostId}`);
    params.append("text", text);
    params.append("api_type", "json");

    await axios.post(`${REDDIT_API_URL}/api/editusertext`, params, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // Update DB
    const updatedPost = await prisma.post.update({
      where: { id: BigInt(postId) },
      data: { content: text },
    });

    res.json({
      message: "Post updated successfully",
      postId: updatedPost.id.toString(),
    });
  } catch (err) {
    console.error("Reddit editPost error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to edit Reddit post" });
  }
};

/**
 * DELETE /api/reddit/post/:postId
 * Deletes a post from Reddit and marks it deleted in the DB.
 */
const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(403).json({ message: "Reddit account not connected" });
    }

    const dbPost = await prisma.post.findFirst({
      where: {
        id: BigInt(postId),
        socialAccountId: account.id,
        deleted: false,
      },
    });

    if (!dbPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (dbPost.externalPostId) {
      const token = await getValidToken(account);
      const params = new URLSearchParams();
      params.append("id", `t3_${dbPost.externalPostId}`);

      await axios.post(`${REDDIT_API_URL}/api/del`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    }

    // Soft-delete in DB
    await prisma.post.update({
      where: { id: BigInt(postId) },
      data: { deleted: true },
    });

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Reddit deletePost error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to delete Reddit post" });
  }
};

/**
 * GET /api/reddit/posts
 * Returns all non-deleted Reddit posts for the current user.
 */
const getPosts = async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.json({ posts: [] });
    }

    const posts = await prisma.post.findMany({
      where: {
        socialAccountId: account.id,
        deleted: false,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      posts: posts.map((p) => ({
        id: p.id.toString(),
        content: p.content,
        status: p.status,
        externalPostId: p.externalPostId,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error("Reddit getPosts error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * DELETE /api/reddit/disconnect
 * Revokes the Reddit token and deletes the SocialAccount from the DB.
 */
const disconnect = async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(404).json({ message: "Reddit account not connected" });
    }

    // Attempt to revoke the token with Reddit
    try {
      const credentials = Buffer.from(
        `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
      ).toString("base64");

      const params = new URLSearchParams();
      params.append("token", account.accessToken);
      params.append("token_type_hint", "access_token");

      await axios.post(
        "https://www.reddit.com/api/v1/revoke_token",
        params,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
    } catch (revokeErr) {
      // Non-fatal — proceed with DB cleanup even if revoke fails
      console.warn("Reddit token revoke failed (non-fatal):", revokeErr.message);
    }

    await prisma.socialAccount.delete({ where: { id: account.id } });

    res.json({ message: "Reddit account disconnected successfully" });
  } catch (err) {
    console.error("Reddit disconnect error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  initiateLogin,
  callback,
  getStatus,
  createPost,
  editPost,
  deletePost,
  getPosts,
  disconnect,
};
