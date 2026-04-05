const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  // For browser-redirect flows (e.g. Reddit OAuth initiation), accept token via query param
  const queryToken = req.query?.token;
  const authHeader = req.headers.authorization;

  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = {
  authenticate,
};
