require("dotenv").config();
const app = require("./app");
const { startWorker } = require("./queues/postQueue");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startWorker();
});
