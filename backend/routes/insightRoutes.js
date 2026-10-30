const express = require("express")
const { atRisk, overview, studentReport, myReport, notifications } = require("../controllers/insights")
const { requireAuth, requireRole, requireStaff } = require("../middlewares/auth")

const router = express.Router()

router.get("/insights/at-risk", requireStaff, atRisk)
router.get("/stats/overview", requireStaff, overview)
router.get("/students/:id/report", requireStaff, studentReport)
router.get("/me/report", requireRole("student"), myReport)
router.get("/me/notifications", requireAuth, notifications)

module.exports = router
