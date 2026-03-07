const express = require("express");
const generateController = require("../controllers/generate.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// POST /api/generate
// Body: { prompt: string, attitude: string, includeImage: boolean }
router.post("/", authenticate, generateController.generate);

module.exports = router;

