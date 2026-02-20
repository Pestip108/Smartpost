const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", require("./routes/health.routes"));

app.use("/api/users", require("./routes/user.routes"));


module.exports = app;
