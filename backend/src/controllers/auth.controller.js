const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../prisma/client");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function sendBrevoEmail({ to, subject, htmlContent, textContent }) {
    if (!process.env.BREVO_API_KEY) {
        console.log(`Failed to email code (Missing BREVO_API_KEY)`);
        return;
    }
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            sender: { name: "Smartpost Auth", email: process.env.BREVO_SENDER_EMAIL || "smartpost.ai.1@gmail.com" },
            to: [{ email: to }],
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent
        })
    });
    if (!response.ok) {
        const err = await response.text();
        console.error(`Brevo API Error: ${err}`);
    }
}

const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const signup = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // Save temporary data
        await prisma.emailVerification.upsert({
            where: { email },
            create: {
                email,
                password: hashedPassword,
                code,
                expiresAt,
                attempts: 0,
            },
            update: {
                password: hashedPassword,
                code,
                expiresAt,
                attempts: 0, // reset attempts on new code
            },
        });

        // Send code via email
        await sendBrevoEmail({
            to: email,
            subject: "Your Verification Code",
            textContent: `Your verification code is: ${code}. It will expire in 15 minutes.`,
            htmlContent: `<h3>Welcome to Smartpost</h3><p>Your verification code is: <strong>${code}</strong></p><p>It will expire in 15 minutes.</p>`,
        });

        res.status(200).json({ message: "Verification code sent to email" });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: "Email and code are required" });
        }

        const verificationRecord = await prisma.emailVerification.findUnique({
            where: { email },
        });

        if (!verificationRecord) {
            return res.status(400).json({ message: "No pending verification found for this email" });
        }

        if (verificationRecord.attempts >= 5) {
            return res.status(400).json({ message: "Too many failed attempts. Please request a new code." });
        }

        if (new Date() > verificationRecord.expiresAt) {
            return res.status(400).json({ message: "Verification code has expired" });
        }

        if (verificationRecord.code !== code) {
            await prisma.emailVerification.update({
                where: { email },
                data: { attempts: { increment: 1 } },
            });
            return res.status(400).json({ message: "Invalid verification code" });
        }

        // Code is valid! Create the real User.
        const newUser = await prisma.user.create({
            data: {
                email: verificationRecord.email,
                password: verificationRecord.password,
                role: "standard",
            },
        });

        // Clean up
        await prisma.emailVerification.delete({
            where: { email },
        });

        // Generate JWT
        const token = jwt.sign(
            { userId: newUser.id.toString(), email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET || "fallback_secret",
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Email verified and account created successfully",
            token,
            user: {
                id: newUser.id.toString(),
                email: newUser.email,
                role: newUser.role,
            }
        });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const resendCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required" });

        const verificationRecord = await prisma.emailVerification.findUnique({
            where: { email },
        });

        if (!verificationRecord) {
            return res.status(400).json({ message: "No pending signup found for this email" });
        }

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.emailVerification.update({
            where: { email },
            data: {
                code,
                expiresAt,
                attempts: 0,
            },
        });

        // Send code via email
        await sendBrevoEmail({
            to: email,
            subject: "Your New Verification Code",
            textContent: `Your new verification code is: ${code}. It will expire in 15 minutes.`,
            htmlContent: `<p>Your new verification code is: <strong>${code}</strong>. It will expire in 15 minutes.</p>`
        });

        res.status(200).json({ message: "New verification code sent" });
    } catch (error) {
        console.error("Resend code error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET || "fallback_secret",
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id.toString(),
                email: user.email,
                role: user.role,
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const googleAuth = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Google token is required" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        if (!email) {
            return res.status(400).json({ message: "Invalid Google token (no email)" });
        }

        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // New user trying to sign up with Google - enforce 2FA/verification code
            const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-10) + Date.now().toString(), 10);
            
            const code = generateCode();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await prisma.emailVerification.upsert({
                where: { email },
                create: {
                    email,
                    password: dummyPassword,
                    code,
                    expiresAt,
                    attempts: 0,
                },
                update: {
                    password: dummyPassword,
                    code,
                    expiresAt,
                    attempts: 0,
                },
            });

            // Send code via email
            await sendBrevoEmail({
                to: email,
                subject: "Your Verification Code (Google Link)",
                textContent: `Your verification code is: ${code}. It will expire in 15 minutes.`,
                htmlContent: `<h3>Welcome to Smartpost</h3><p>Your verification code is: <strong>${code}</strong></p><p>It will expire in 15 minutes.</p>`,
            });

            return res.status(200).json({ 
                requiresVerification: true, 
                message: "Verification code sent to email",
                email: email
            });
        }

        const serviceToken = jwt.sign(
            { userId: user.id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET || "fallback_secret",
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Google Login successful",
            token: serviceToken,
            user: {
                id: user.id.toString(),
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        console.error("Google Auth error:", error);
        res.status(500).json({ message: "Internal server error during Google Authentication" });
    }
};

module.exports = {
    signup,
    verifyEmail,
    resendCode,
    login,
    googleAuth,
};
