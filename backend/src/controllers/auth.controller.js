const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const prisma = require("../prisma/client");

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

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
        const mailOptions = {
            from: `"Smartpost Auth" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your Verification Code",
            text: `Your verification code is: ${code}. It will expire in 15 minutes.`,
            html: `<h3>Welcome to Smartpost</h3><p>Your verification code is: <strong>${code}</strong></p><p>It will expire in 15 minutes.</p>`,
        };

        // Note: If you haven't set SMTP variables, sending will fail.
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`Failed to email code`);
        }

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
        const mailOptions = {
            from: `"Smartpost Auth" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your New Verification Code",
            text: `Your new verification code is: ${code}. It will expire in 15 minutes.`,
        };

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`[TESTING] New verification code for ${email}: ${code}`);
        }

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

module.exports = {
    signup,
    verifyEmail,
    resendCode,
    login,
};
