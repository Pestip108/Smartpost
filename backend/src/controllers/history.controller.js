const prisma = require("../prisma/client");

const getHistory = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    
    // Fetch manual Drafts
    const drafts = await prisma.draft.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch Posts from LinkedIn/Scheduler
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: {
          include: { platform: true }
        }
      }
    });

    let posts = [];
    if (user && user.socialAccounts.length > 0) {
      const accountIds = user.socialAccounts.map(acc => acc.id);
      posts = await prisma.post.findMany({
        where: { socialAccountId: { in: accountIds }, deleted: false },
        orderBy: { createdAt: "desc" },
      });
    }

    // Normalize Data
    const normalizedDrafts = drafts.map(d => ({
      id: `draft_${d.id.toString()}`,
      originalId: d.id.toString(),
      type: 'manual_draft',
      content: d.content,
      imageUrl: d.imageUrl,
      topic: d.topic,
      createdAt: d.createdAt,
      status: 'draft',
      platform: null,
    }));

const filteredPosts = posts.filter(p => p.status !== 'draft');

    const normalizedPosts = filteredPosts.map(p => {
      const acc = user.socialAccounts.find(a => a.id === p.socialAccountId);
      return {
        id: `post_${p.id.toString()}`,
        originalId: p.id.toString(),
        type: 'post',
        content: p.content,
        imageUrl: p.mediaUrl, 
        topic: null, 
        createdAt: p.createdAt,
        scheduledAt: p.scheduledAt,
        status: p.status, // draft, scheduled, posted, failed
        platform: acc ? acc.platform.platformName : null,
        externalPostId: p.externalPostId
      };
    });

    const combined = [...normalizedDrafts, ...normalizedPosts];
    // Sort combined by createdAt desc initially
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(combined);
  } catch (err) {
    console.error("History controller error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteHistoryItem = async (req, res) => {
  const { id } = req.params;
  const userId = BigInt(req.user.userId);

  try {
    if (id.startsWith('draft_')) {
      const draftId = BigInt(id.split('_')[1]);
      const draft = await prisma.draft.findUnique({ where: { id: draftId } });
      if (!draft || draft.userId !== userId) {
        return res.status(404).json({ message: "Draft not found or unauthorized" });
      }
      await prisma.draft.delete({ where: { id: draftId } });
      return res.json({ message: "Draft deleted" });
    } 
    
    if (id.startsWith('post_')) {
      const postId = BigInt(id.split('_')[1]);
      const post = await prisma.post.findUnique({ 
        where: { id: postId },
        include: { socialAccount: true } 
      });
      if (!post || post.socialAccount.userId !== userId) {
        return res.status(404).json({ message: "Post not found or unauthorized" });
      }
      
      await prisma.post.update({
        where: { id: postId },
        data: { deleted: true }
      });
      return res.json({ message: "Post deleted" });
    }

    return res.status(400).json({ message: "Invalid ID format" });
  } catch (err) {
    console.error("Delete history error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getHistory,
  deleteHistoryItem
};
