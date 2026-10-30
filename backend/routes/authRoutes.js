const express = require("express")
const rateLimit = require("express-rate-limit")
const { handleLogin, handleDemoLogin, handleLogout, checkAuth, getMe, changePassword, updateMyPhoto, getSetupStatus, handleNewAdmin, listStaff } = require("../controllers/auth")
const { requireAuth, requireAdmin } = require("../middlewares/auth")

const router = express.Router()

// Slow down password guessing: 10 failed attempts per IP every 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { msg: "Too many login attempts. Try again in 15 minutes." },
})

router.post("/logininfo", loginLimiter, handleLogin)
router.post("/demo-login", handleDemoLogin)
router.patch("/me/photo", requireAuth, updateMyPhoto)
router.post("/logout", handleLogout)
router.get("/check-auth", requireAuth, checkAuth)
router.get("/me", requireAuth, getMe)
router.patch("/me/password", loginLimiter, requireAuth, changePassword)
router.get("/setup-status", getSetupStatus)
router.post("/admins", handleNewAdmin)
router.get("/staff", requireAdmin, listStaff)

module.exports = router
