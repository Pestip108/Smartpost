const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/public", express.static(path.join(__dirname, "../public")));

// Serve generated images statically: GET /generated_images/<filename>
app.use("/generated_images", express.static(path.join(__dirname, "../../public/generated_images")));

app.use("/api/health", require("./routes/health.routes"));

app.use("/api/users", require("./routes/user.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/generate", require("./routes/generate.routes"));
app.use("/api/scheduler", require("./routes/scheduler.routes"));
app.use("/api/linkedin", require("./routes/linkedin.routes"));
app.use("/api/drafts", require("./routes/draft.routes"));

app.get("/debug", async (req, res) => {
    const { exec } = require("child_process");

    exec("which python3", (err, stdout, stderr) => {
        res.json({
            err: err?.message,
            stdout,
            stderr
        });
    });
});


module.exports = app;
