const axios = require("axios");
const prisma = require("../prisma/client");

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_URL = "https://api.linkedin.com";
const LINKEDIN_VERSION = "202306"; // LinkedIn API versioning header


const PLATFORM_NAME = "linkedin";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getLinkedInPlatform() {
  return prisma.platform.upsert({
    where: { platformName: PLATFORM_NAME },
    create: {
      platformName: PLATFORM_NAME,
      apiBaseUrl: LINKEDIN_API_URL,
      isActive: true,
    },
    update: {},
  });
}

async function getAccount(userId) {
  const platform = await getLinkedInPlatform();
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
 * Refreshes the LinkedIn access token if expired (within 60s buffer).
 * LinkedIn refresh tokens last up to 1 year when offline_access scope is granted.
 */
async function getValidToken(account) {
  const now = new Date();
  const buffer = new Date(now.getTime() + 60 * 1000);

  if (account.expiresAt && account.expiresAt > buffer) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    throw new Error("LinkedIn session expired. Please disconnect and reconnect your account.");
  }


  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", account.refreshToken);
  params.append("client_id", process.env.LINKEDIN_CLIENT_ID);
  params.append("client_secret", process.env.LINKEDIN_CLIENT_SECRET);

  const response = await axios.post(LINKEDIN_TOKEN_URL, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const { access_token, expires_in, refresh_token } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token || account.refreshToken,
      expiresAt,
    },
  });

  return access_token;
}

/**
 * Builds the standard LinkedIn REST API headers.
 */
function linkedInHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": LINKEDIN_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
    ...extra,
  };
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/linkedin/login?token=<jwt>
 * Redirects the user to LinkedIn's OAuth2 authorization page.
 */
const initiateLogin = (req, res) => {
  const userId = req.user.userId;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    state: userId,
    scope: "openid profile email w_member_social",
    prompt: "consent",



  });

  res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
};

/**
 * GET /api/linkedin/callback
 * LinkedIn redirects here after the user approves the app.
 * Exchanges the code for tokens and stores the account in DB.
 */
const callback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173/linkedin?error=${error}`);
  }

  if (!code || !state) {
    return res.redirect("http://localhost:5173/linkedin?error=missing_params");
  }

  try {
    // Exchange code for tokens
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.LINKEDIN_REDIRECT_URI);
    params.append("client_id", process.env.LINKEDIN_CLIENT_ID);
    params.append("client_secret", process.env.LINKEDIN_CLIENT_SECRET);

    const tokenRes = await axios.post(LINKEDIN_TOKEN_URL, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch the LinkedIn member's profile (OpenID userinfo endpoint)
    const meRes = await axios.get(`${LINKEDIN_API_URL}/v2/userinfo`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
      },
    });

    const { sub: personId, name: fullName } = meRes.data;
    const linkedinUrn = `urn:li:person:${personId}`;

    const platform = await getLinkedInPlatform();
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
        refreshToken: refresh_token || null,
        expiresAt,
        linkedinUrn,
        linkedinName: fullName || null,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt,
        linkedinUrn,
        linkedinName: fullName || null,
      },
    });

    res.redirect("http://localhost:5173/linkedin?connected=true");
  } catch (err) {
    console.error("LinkedIn callback error:", err.response?.data || err.message);
    res.redirect("http://localhost:5173/linkedin?error=token_exchange_failed");
  }
};

/**
 * GET /api/linkedin/status
 * Returns whether the current user has a linked LinkedIn account.
 */
const getStatus = async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) return res.json({ connected: false });
    res.json({
      connected: true,
      name: account.linkedinName,
      urn: account.linkedinUrn,
    });
  } catch (err) {
    console.error("LinkedIn status error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/linkedin/post
 * Body: { text }
 * Publishes a text post to the user's LinkedIn feed.
 */
const createPost = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "text is required" });
  }

  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(403).json({ message: "LinkedIn account not connected" });
    }

    const token = await getValidToken(account);

    const payload = {
      author: account.linkedinUrn,
      commentary: text.trim(),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    const postRes = await axios.post(
      `${LINKEDIN_API_URL}/rest/posts`,
      payload,
      { headers: linkedInHeaders(token) }
    );

    // LinkedIn returns the post URN in the x-restli-id response header
    const externalPostId =
      postRes.headers["x-restli-id"] || postRes.data?.id || null;

    // Persist to DB
    const dbPost = await prisma.post.create({
      data: {
        socialAccountId: account.id,
        content: text.trim(),
        type: "text",
        status: "posted",
        externalPostId,
      },
    });

    res.status(201).json({
      message: "Posted to LinkedIn successfully",
      postId: dbPost.id.toString(),
      externalPostId,
    });
  } catch (err) {
    console.error("LinkedIn createPost error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to post to LinkedIn" });
  }
};

/**
 * PATCH /api/linkedin/post/:postId
 * Body: { text }
 * Edits the commentary of an existing LinkedIn post.
 */
const editPost = async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "text is required" });
  }

  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(403).json({ message: "LinkedIn account not connected" });
    }

    const dbPost = await prisma.post.findFirst({
      where: { id: BigInt(postId), socialAccountId: account.id, deleted: false },
    });

    if (!dbPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!dbPost.externalPostId) {
      return res.status(400).json({ message: "No external LinkedIn post ID found" });
    }

    const token = await getValidToken(account);

    // LinkedIn REST PATCH for posts uses JSON Patch format
    const patchPayload = {
      patch: { $set: { commentary: text.trim() } },
    };

    // The externalPostId is a full URN like urn:li:share:xxx — URL-encode it for the path
    const encodedPostId = encodeURIComponent(dbPost.externalPostId);

    await axios.post(
      `${LINKEDIN_API_URL}/rest/posts/${encodedPostId}`,
      patchPayload,
      {
        headers: {
          ...linkedInHeaders(token),
          "X-HTTP-Method-Override": "PATCH",
        },
      }
    );

    await prisma.post.update({
      where: { id: BigInt(postId) },
      data: { content: text.trim() },
    });

    res.json({ message: "Post updated successfully", postId });
  } catch (err) {
    console.error("LinkedIn editPost error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to edit LinkedIn post" });
  }
};

/**
 * DELETE /api/linkedin/post/:postId
 * Deletes the post from LinkedIn and soft-deletes it in the DB.
 */
const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(403).json({ message: "LinkedIn account not connected" });
    }

    const dbPost = await prisma.post.findFirst({
      where: { id: BigInt(postId), socialAccountId: account.id, deleted: false },
    });

    if (!dbPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (dbPost.externalPostId) {
      const token = await getValidToken(account);
      const encodedPostId = encodeURIComponent(dbPost.externalPostId);

      await axios.delete(`${LINKEDIN_API_URL}/rest/posts/${encodedPostId}`, {
        headers: linkedInHeaders(token),
      });
    }

    await prisma.post.update({
      where: { id: BigInt(postId) },
      data: { deleted: true },
    });

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("LinkedIn deletePost error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to delete LinkedIn post" });
  }
};

/**
 * GET /api/linkedin/posts
 * Returns all non-deleted LinkedIn posts for the current user.
 */
const getPosts = async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) return res.json({ posts: [] });

    const posts = await prisma.post.findMany({
      where: { socialAccountId: account.id, deleted: false },
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
    console.error("LinkedIn getPosts error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * DELETE /api/linkedin/disconnect
 * Revokes the LinkedIn access token and removes the SocialAccount from the DB.
 */
const disconnect = async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) {
      return res.status(404).json({ message: "LinkedIn account not connected" });
    }

    // LinkedIn doesn't have a public token revocation endpoint for web apps,
    // so we simply delete the DB record.
    await prisma.socialAccount.delete({ where: { id: account.id } });

    res.json({ message: "LinkedIn account disconnected successfully" });
  } catch (err) {
    console.error("LinkedIn disconnect error:", err.message);
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
