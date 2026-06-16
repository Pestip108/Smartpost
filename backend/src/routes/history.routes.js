const express = require("express");
const { getHistory, deleteHistoryItem } = require("../controllers/history.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", getHistory);
router.delete("/:id", deleteHistoryItem);

module.exports = router;
