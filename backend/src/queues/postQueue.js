const { Queue, Worker, QueueEvents } = require("bullmq");
const { spawn } = require("child_process");
const path = require("path");
const prisma = require("../prisma/client");
const nodemailer = require("nodemailer");

// Node Mailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});


// ── Redis connection ──────────────────────────────────────────────────────────
const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

const QUEUE_NAME = "post-generation";

// ── Queue (used by scheduler controller to add / remove jobs) ─────────────────
const postQueue = new Queue(QUEUE_NAME, { connection });

// ── Helpers re-used from generate.controller.js ──────────────────────────────
const PYTHON_DIR = path.join(__dirname, "../../python");
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

/**
 * Run a Python script and return its stdout as a parsed JSON object.
 * @param {string} script  - filename in python/ dir
 * @param {string[]} args  - CLI arguments to pass
 * @returns {Promise<object>}
 */
function runPython(script, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(PYTHON_DIR, script);
        const proc = spawn(PYTHON_CMD, [scriptPath, ...args], {
            env: { ...process.env },
            cwd: PYTHON_DIR,
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (d) => (stdout += d.toString()));
        proc.stderr.on("data", (d) => (stderr += d.toString()));

        proc.on("close", (code) => {
            // Extract the last valid JSON line from stdout (scripts may log other things)
            const lines = stdout.split("\n").filter((l) => l.trim().startsWith("{"));
            if (lines.length > 0) {
                try {
                    resolve(JSON.parse(lines[lines.length - 1]));
                } catch (e) {
                    reject(new Error(`JSON parse error for ${script}: ${stdout}`));
                }
            } else {
                // Non-zero exit or no JSON — return a degraded result
                resolve({ source: script, array: [], error: stderr || `No output (exit ${code})` });
            }
        });

        proc.on("error", (err) => reject(err));
    });
}

// ── Worker (processes jobs) ───────────────────────────────────────────────────
let worker;

function startWorker() {
    worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            const { scheduledTaskId, topic, attitude, includeImage, userId } =
                job.data;

            console.log(
                `[BullMQ] Processing job ${job.id} for task ${scheduledTaskId}`
            );

            // 1. Run google scraper
            const googleData = await runPython("google_scrape.py", [topic, attitude]);

            // 2. Call webhook to generate post text
            const postRes = await fetch(process.env.GOOGLE_SCRAPER_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(googleData),
            });
            const postData = await postRes.json();

            // 3. Optionally generate image
            let imageUrl = null;
            if (includeImage) {
                const imagePrompt = `${topic} — ${attitude} style, social media post image, vibrant, modern`;
                const imgResult = await runPython("image_generator.py", [imagePrompt]);
                if (imgResult.success && imgResult.url) {
                    imageUrl = imgResult.url;
                }
            }

            // 4. Ensure Platform / SocialAccount exist
            // const bigUserId = BigInt(userId);
            // let platform = await prisma.platform.findUnique({
            //     where: { platformName: "Smartpost Default" },
            // });
            // if (!platform) {
            //     platform = await prisma.platform.create({
            //         data: {
            //             platformName: "Smartpost Default",
            //             apiBaseUrl: "http://localhost",
            //         },
            //     });
            // }

            // let socialAccount = await prisma.socialAccount.findUnique({
            //     where: {
            //         unique_user_platform: {
            //             userId: bigUserId,
            //             platformId: platform.id,
            //         },
            //     },
            // });
            // if (!socialAccount) {
            //     socialAccount = await prisma.socialAccount.create({
            //         data: {
            //             userId: bigUserId,
            //             platformId: platform.id,
            //             accessToken: "dummy_token",
            //         },
            //     });
            // }

            // 5. Save Post with status = "scheduled" → "posted"
            const socialAccountId = 1;
            await prisma.post.create({
                data: {
                    socialAccountId: socialAccountId,
                    content: postData.output,
                    mediaUrl: imageUrl,
                    type: includeImage ? "image" : "text",
                    status: "draft",
                    scheduledAt: new Date(),
                },
            });

            // 6. Save ResearchReport
            await prisma.researchReport.create({
                data: {
                    postId: (
                        await prisma.post.findFirst({
                            where: { socialAccountId: socialAccountId },
                            orderBy: { createdAt: "desc" },
                        })
                    ).id,
                    topic,
                    generatedReport: JSON.stringify(googleData),
                },
            });

            // 7. Update ScheduledTask.nextExecution
            const task = await prisma.scheduledTask.findUnique({
                where: { id: BigInt(scheduledTaskId) },
            });
            if (task && task.isActive) {
                const next = new Date(
                    Date.now() + task.intervalHours * 60 * 60 * 1000
                );
                await prisma.scheduledTask.update({
                    where: { id: task.id },
                    data: { nextExecution: next },
                });
                // Re-queue for next execution
                const delay = next.getTime() - Date.now();
                await postQueue.add(
                    "generate-post",
                    { ...job.data },
                    { delay: Math.max(delay, 0) }
                );
            }

            console.log(`[BullMQ] Job ${job.id} done.`);

            const bigUserId = BigInt(userId);
            let user = await prisma.user.findUnique({ where: { id: bigUserId } });
            let subject = "Post Successfuly Created!";
            let text = `Your post about ${topic} was successfuly created!`;
            let html = `<p>You post about <strong>"${topic}"</strong> was successfuly created and stored as draft!<br/>We can't post it yet because no social account has been linked yet.</p>
            <br/><br/>
            <p>${postData.output}</p>
            <img src="../../${imageUrl}" alt="Post Image" />
            `;

            await sendEmail(user.email, subject, text, html);

            return { success: true };
        },
        { connection }
    );

    worker.on("failed", async (job, err) => {
        console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);
        if (job?.data?.scheduledTaskId) {
            prisma.scheduledTask
                .update({
                    where: { id: BigInt(job.data.scheduledTaskId) },
                    data: { isActive: false },
                })
                .catch(() => { });

            const bigUserId = BigInt(job.data.userId);
            let user = await prisma.user.findUnique({ where: { id: bigUserId } });
            let subject = "Error While Creating Post";
            let text = `There was an error while creating your post about "${job.data.topic}"`;
            let html = `<p>There was an error while creating your post about <strong>"${job.data.topic}"</strong>.<br/>Please go check it and try again later.<br/><br/>Error: <strong>${err}</strong></p>`;

            await sendEmail(user.email, subject, text, html);
        }
    });

    console.log("[BullMQ] Worker started.");
    return worker;
}

async function sendEmail(email, subject, text, html) {
    // Send Confirmation Email
    const mailOptions = {
        from: `"Smartpost Auth" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        text: text,
        html: html,
    };

    // Note: If you haven't set SMTP variables, sending will fail.
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
    } else {
        console.log(`Failed to email code`);
    }
}

module.exports = { postQueue, startWorker };
