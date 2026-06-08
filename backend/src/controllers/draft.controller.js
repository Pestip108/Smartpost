const prisma = require("../prisma/client");

/**
 * POST /api/drafts
 * Body: { topic, content, imageUrl }
 * Saves a generated post as a draft for the current user.
 */
const saveDraft = async (req, res) => {
  const { topic, content, imageUrl } = req.body;
  
  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }

  try {
    const draft = await prisma.draft.create({
      data: {
        userId: req.user.userId,
        topic: topic || null,
        content,
        imageUrl: imageUrl || null,
      },
    });
    
    // We need to convert BigInt to string before sending JSON
    res.status(201).json({
      message: "Draft saved successfully",
      draft: {
        ...draft,
        id: draft.id.toString(),
        userId: draft.userId.toString(),
      }
    });
  } catch (err) {
    console.error("Save draft error:", err.message);
    res.status(500).json({ message: "Failed to save draft" });
  }
};

/**
 * GET /api/drafts
 * Returns all drafts for the current user, ordered by newest first.
 */
const getDrafts = async (req, res) => {
  try {
    const drafts = await prisma.draft.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    const formattedDrafts = drafts.map(d => ({
      id: d.id.toString(),
      topic: d.topic,
      content: d.content,
      imageUrl: d.imageUrl,
      createdAt: d.createdAt,
    }));

    res.json(formattedDrafts);
  } catch (err) {
    console.error("Get drafts error:", err.message);
    res.status(500).json({ message: "Failed to retrieve drafts" });
  }
};

/**
 * DELETE /api/drafts/:id
 * Deletes a specific draft.
 */
const deleteDraft = async (req, res) => {
  const { id } = req.params;

  try {
    const draft = await prisma.draft.findUnique({
      where: { id: BigInt(id) },
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    if (draft.userId !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.draft.delete({
      where: { id: BigInt(id) },
    });

    res.json({ message: "Draft deleted successfully" });
  } catch (err) {
    console.error("Delete draft error:", err.message);
    res.status(500).json({ message: "Failed to delete draft" });
  }
};

module.exports = {
  saveDraft,
  getDrafts,
  deleteDraft,
};
