const express = require("express");
const draftController = require("../controllers/draft.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", draftController.saveDraft);
router.get("/", draftController.getDrafts);
router.delete("/:id", draftController.deleteDraft);

module.exports = router;
