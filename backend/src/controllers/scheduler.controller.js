const prisma = require("../prisma/client");
const { postQueue } = require("../queues/postQueue");

// Helper to serialise BigInt fields in responses
function serializeTask(t) {
    return {
        ...t,
        id: t.id.toString(),
        socialAccountId: t.socialAccountId.toString(),
    };
}

// ── POST /api/scheduler  (create a new scheduled task) ───────────────────────
exports.create = async (req, res) => {
    const {
        topic,
        attitude = "Neutral",
        includeImage = false,
        intervalHours,
        scheduledAt, // ISO string for first run, e.g. "2026-03-14T08:00:00Z"
    } = req.body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
        return res.status(400).json({ message: "topic is required" });
    }
    if (!intervalHours || isNaN(intervalHours) || intervalHours < 1) {
        return res
            .status(400)
            .json({ message: "intervalHours must be a positive integer" });
    }
    if (!scheduledAt) {
        return res.status(400).json({ message: "scheduledAt is required" });
    }

    const firstRun = new Date(scheduledAt);
    if (isNaN(firstRun.getTime()) || firstRun <= new Date()) {
        return res
            .status(400)
            .json({ message: "scheduledAt must be a future date-time" });
    }

    const userId = BigInt(req.user.userId);

    try {
        // Ensure Platform / SocialAccount exist (same approach as generate controller)
        let platform = await prisma.platform.findUnique({
            where: { platformName: "Smartpost Default" },
        });
        if (!platform) {
            platform = await prisma.platform.create({
                data: {
                    platformName: "Smartpost Default",
                    apiBaseUrl: "http://localhost",
                },
            });
        }

        let socialAccount = await prisma.socialAccount.findUnique({
            where: {
                unique_user_platform: { userId, platformId: platform.id },
            },
        });
        if (!socialAccount) {
            socialAccount = await prisma.socialAccount.create({
                data: {
                    userId,
                    platformId: platform.id,
                    accessToken: "dummy_token",
                },
            });
        }

        // Create the DB record
        const task = await prisma.scheduledTask.create({
            data: {
                topic: topic.trim(),
                intervalHours: parseInt(intervalHours, 10),
                nextExecution: firstRun,
                isActive: true,
                socialAccountId: socialAccount.id,
            },
        });

        // Enqueue the first job with a delay until firstRun
        const delay = firstRun.getTime() - Date.now();
        await postQueue.add(
            "generate-post",
            {
                scheduledTaskId: task.id.toString(),
                topic: task.topic,
                attitude,
                includeImage,
                userId: userId.toString(),
            },
            { delay: Math.max(delay, 0) }
        );

        return res.status(201).json(serializeTask(task));
    } catch (err) {
        console.error("Scheduler create error:", err);
        return res
            .status(500)
            .json({ message: "Failed to create scheduled task", error: err.message });
    }
};

// ── GET /api/scheduler  (list tasks for the current user) ────────────────────
exports.list = async (req, res) => {
    const userId = BigInt(req.user.userId);
    try {
        const tasks = await prisma.scheduledTask.findMany({
            where: {
                isActive: true,
                socialAccount: { userId },
            },
            orderBy: { nextExecution: "asc" },
        });
        return res.json(tasks.map(serializeTask));
    } catch (err) {
        console.error("Scheduler list error:", err);
        return res
            .status(500)
            .json({ message: "Failed to list tasks", error: err.message });
    }
};

// ── DELETE /api/scheduler/:id  (cancel / deactivate a task) ──────────────────
exports.cancel = async (req, res) => {
    const userId = BigInt(req.user.userId);
    const taskId = BigInt(req.params.id);

    try {
        const task = await prisma.scheduledTask.findUnique({
            where: { id: taskId },
            include: { socialAccount: true },
        });

        if (!task) return res.status(404).json({ message: "Task not found" });
        if (task.socialAccount.userId !== userId)
            return res.status(403).json({ message: "Forbidden" });

        await prisma.scheduledTask.update({
            where: { id: taskId },
            data: { isActive: false },
        });

        // Remove all waiting/delayed BullMQ jobs for this task
        const waiting = await postQueue.getDelayed();
        for (const job of waiting) {
            if (job.data?.scheduledTaskId === taskId.toString()) {
                await job.remove();
            }
        }

        return res.json({ message: "Task cancelled" });
    } catch (err) {
        console.error("Scheduler cancel error:", err);
        return res
            .status(500)
            .json({ message: "Failed to cancel task", error: err.message });
    }
};
