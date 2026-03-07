const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/public", express.static("public"));

// Serve generated images statically: GET /generated_images/<filename>
app.use("/generated_images", express.static(path.join(__dirname, "../../public/generated_images")));

app.use("/api/health", require("./routes/health.routes"));

app.use("/api/users", require("./routes/user.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/generate", require("./routes/generate.routes"));

module.exports = app;
