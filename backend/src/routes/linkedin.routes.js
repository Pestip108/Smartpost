const express = require("express");
const linkedinController = require("../controllers/linkedin.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// OAuth2 flow
router.get("/login", authenticate, linkedinController.initiateLogin);
router.get("/callback", linkedinController.callback);

// Account status
router.get("/status", authenticate, linkedinController.getStatus);

// Post management
router.get("/posts", authenticate, linkedinController.getPosts);
router.post("/post", authenticate, linkedinController.createPost);
router.patch("/post/:postId", authenticate, linkedinController.editPost);
router.delete("/post/:postId", authenticate, linkedinController.deletePost);

// Disconnect
router.delete("/disconnect", authenticate, linkedinController.disconnect);

module.exports = router;
