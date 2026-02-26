const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");

const router = express.Router();

// Rate limiting for resend-code (max 3 times per hour per IP)
const resendCodeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { message: "Too many requests to resend verification code. Please try again after an hour." },
});

router.post("/signup", authController.signup);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-code", resendCodeLimiter, authController.resendCode);
router.post("/login", authController.login);

module.exports = router;
