const { spawn } = require("child_process");
const path = require("path");
const prisma = require("../prisma/client");

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


/**
 * POST /api/generate
 * Body: { prompt: string, attitude: string, includeImage: boolean }
 */
exports.generate = async (req, res) => {
    const { prompt, attitude = "Neutral", includeImage = false } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return res.status(400).json({ message: "prompt is required" });
    }

    const sanitizedPrompt = prompt.trim();
    const userId = BigInt(req.user.userId);

    try {
        // 1. Run scrapers in parallel (Google is primary; Facebook optional)
        const scraperPromises = [
            runPython("google_scrape.py", [sanitizedPrompt, attitude]),
        ];

        // // Optionally also run facebook (may fail if no session)
        // scraperPromises.push(
        //     runPython("facebook_scrape.py", [sanitizedPrompt]).catch(() => ({
        //         source: "facebook",
        //         array: [],
        //         error: "facebook scraper unavailable",
        //     }))
        // );

        const [googleData] = await Promise.all(scraperPromises);

        console.log(googleData);

        const postRes = await fetch(process.env.GOOGLE_SCRAPER_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(googleData)
        });

        const postData = await postRes.json();
        console.log(postData);

        // 3. Generate post text via LLM
        // const postText = await generatePostText(sanitizedPrompt, attitude, allTexts);

        // 4. Optionally generate image
        let imageUrl = null;
        let imageFilename = null;

        if (includeImage) {
            const imagePrompt = `${sanitizedPrompt} — ${attitude} style, social media post image, vibrant, modern`;
            const imgResult = await runPython("image_generator.py", [imagePrompt]);
            if (imgResult.success && imgResult.url) {
                imageUrl = imgResult.url;           // e.g. /generated_images/foo_20260305_132000.png
                imageFilename = imgResult.filename;
            } else {
                console.log("Error while generating image:", imgResult.error);
            }
        }

        // 5. Database Integration: Ensure dummy Platform and SocialAccount
        let platform = await prisma.platform.findUnique({
            where: { platformName: "Smartpost Default" }
        });
        if (!platform) {
            platform = await prisma.platform.create({
                data: {
                    platformName: "Smartpost Default",
                    apiBaseUrl: "http://localhost",
                }
            });
        }

        let socialAccount = await prisma.socialAccount.findUnique({
            where: {
                unique_user_platform: {
                    userId: userId,
                    platformId: platform.id,
                }
            }
        });
        if (!socialAccount) {
            socialAccount = await prisma.socialAccount.create({
                data: {
                    userId: userId,
                    platformId: platform.id,
                    accessToken: "dummy_token",
                }
            });
        }

        // 6. Save the Post
        const post = await prisma.post.create({
            data: {
                socialAccountId: socialAccount.id,
                content: postData.output,
                mediaUrl: imageUrl,
                type: includeImage ? "image" : "text",
                status: "draft",
            }
        });

        // 7. Save the ResearchReport
        await prisma.researchReport.create({
            data: {
                postId: post.id,
                topic: sanitizedPrompt,
                generatedReport: JSON.stringify(googleData),
            }
        });

        return res.json({
            post: postData.output,
            imageUrl,
            imageFilename,
            scrapedCount: googleData.array?.length,
            sources: {
                google: googleData.array?.length ?? 0,
                // facebook: facebookData.array?.length ?? 0,
            },
        });
    } catch (err) {
        console.error("Generate error:", err);
        return res.status(500).json({ message: "Generation failed", error: err.message });
    }
};
