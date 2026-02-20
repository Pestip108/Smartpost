const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({ status: "OK", message: "SmartPost API running" });
});

module.exports = router;
