const dotenv = require("dotenv")
dotenv.config({ quiet: true })

const nodeEnv = process.env.NODE_ENV || "development"

const env = {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: Number(process.env.PORT) || 8004,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    // comma separated list of frontend URLs allowed to call the API
    clientUrls: (process.env.CLIENT_URLS || "http://localhost:5173,https://student-managment-system-by-pushpak.netlify.app")
        .split(",")
        .map(url => url.trim())
        .filter(Boolean),
    // The hosted setup (Netlify app + Render API) is cross-site, so the login cookie must be
    // SameSite=None + Secure. Behind one origin (Docker Compose: nginx forwards /api) it doesn't need to be.
    crossSiteCookies: process.env.CROSS_SITE_COOKIES ? process.env.CROSS_SITE_COOKIES === "true" : nodeEnv === "production",
    // DEMO_MODE=true shows one-click "try as admin / student" buttons on the login page
    demoMode: process.env.DEMO_MODE === "true",
    demoAccounts: {
        admin: process.env.DEMO_ADMIN_EMAIL || "admin@studenthub.com",
        teacher: process.env.DEMO_TEACHER_EMAIL || "teacher@studenthub.com",
        student: process.env.DEMO_STUDENT_EMAIL || "rahul@studenthub.com",
    },
}

// Fail fast at startup instead of failing on the first login
function assertRequiredEnv() {
    const missing = ["MONGO_URI", "JWT_SECRET"].filter(key => !process.env[key])
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`)
    }
    if (env.isProduction && env.jwtSecret.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production")
    }
}

module.exports = { ...env, assertRequiredEnv }
