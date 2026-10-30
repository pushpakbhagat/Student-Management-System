const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const cookieParser = require("cookie-parser")
const env = require("./config/env")
const { requestLogger } = require("./middlewares/log")
const { rejectCrossSiteRequests } = require("./middlewares/csrf")
const { notFound, errorHandler } = require("./middlewares/errorHandler")
const authRouter = require("./routes/authRoutes")
const studentRouter = require("./routes/studentRoutes")
const courseRouter = require("./routes/courseRoutes")
const assignmentRouter = require("./routes/assignmentRoutes")
const academicRouter = require("./routes/academicRoutes")
const insightRouter = require("./routes/insightRoutes")
const featureRouter = require("./routes/featureRoutes")

// The app is built here and started in index.js, so tests can use it without opening a port
const app = express()

// Render/Railway etc. put a proxy in front of the app; needed for secure cookies and per-IP rate limits
app.set("trust proxy", 1)

// MIDDLEWARE ---------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))   // the frontend is on another origin
app.use(cors({ origin: env.clientUrls, credentials: true }))
app.use(rejectCrossSiteRequests)
if (env.nodeEnv !== "test") app.use(requestLogger)

// A generous ceiling so one client can't flood the API (login has its own stricter limit)
app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { msg: "Too many requests. Slow down and try again in a minute." },
}))

// JSON only: the frontend never sends HTML-form bodies, and refusing them closes off form-based CSRF.
// 400kb leaves room for a profile photo; assignment hand-ins (a 2 MB file as base64) get more.
const UPLOAD_ROUTE = /^\/assignments\/[^/]+\/submission$/
const jsonBody = express.json({ limit: "400kb" })
const uploadBody = express.json({ limit: "3mb" })
app.use((req, res, next) => (UPLOAD_ROUTE.test(req.path) ? uploadBody : jsonBody)(req, res, next))
app.use(cookieParser())

// ROUTES -------------------------------------------------
app.get("/", (req, res) => res.send("the server is running"))
app.get("/health", (req, res) => res.json({ status: "ok" }))

app.use(authRouter)
app.use(studentRouter)
app.use(courseRouter)
app.use(assignmentRouter)
app.use(academicRouter)
app.use(insightRouter)
app.use(featureRouter)

// ERRORS (must come last) --------------------------------
app.use(notFound)
app.use(errorHandler)

module.exports = app
