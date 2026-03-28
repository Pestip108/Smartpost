const express = require("express");
const schedulerController = require("../controllers/scheduler.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// POST   /api/scheduler       — create a recurring scheduled task
// GET    /api/scheduler       — list active tasks for current user
// DELETE /api/scheduler/:id   — cancel a task

router.post("/", authenticate, schedulerController.create);
router.get("/", authenticate, schedulerController.list);
router.delete("/:id", authenticate, schedulerController.cancel);

module.exports = router;
