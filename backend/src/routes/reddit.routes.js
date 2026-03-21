const express = require("express");
const redditController = require("../controllers/reddit.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// OAuth2 flow — authenticate middleware reads userId from JWT to build state param
router.get("/login", authenticate, redditController.initiateLogin);
router.get("/callback", redditController.callback);

// Account status
router.get("/status", authenticate, redditController.getStatus);

// Post management
router.get("/posts", authenticate, redditController.getPosts);
router.post("/post", authenticate, redditController.createPost);
router.patch("/post/:postId", authenticate, redditController.editPost);
router.delete("/post/:postId", authenticate, redditController.deletePost);

// Disconnect
router.delete("/disconnect", authenticate, redditController.disconnect);

module.exports = router;
