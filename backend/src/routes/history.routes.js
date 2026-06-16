const express = require("express");
const { getHistory, deleteHistoryItem } = require("../controllers/history.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getHistory);
router.delete("/:id", deleteHistoryItem);

module.exports = router;
