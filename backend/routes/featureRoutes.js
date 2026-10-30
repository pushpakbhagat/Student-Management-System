const express = require("express")
const rateLimit = require("express-rate-limit")
const { mySubmission, mySubmissions, submit, listSubmissions, gradeSubmission, downloadFile } = require("../controllers/submissions")
const { openCheckin, checkinStatus, finishCheckin, checkIn, setSchedule } = require("../controllers/checkin")
const { requireAdmin, requireAuth, requireRole, requireStaff } = require("../middlewares/auth")

const router = express.Router()
const requireStudent = requireRole("student")

// one check-in attempt every 2 seconds per IP is plenty; stops anyone trying to guess codes
const checkinLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { msg: "Too many check-in attempts. Wait a minute." } })

// SUBMISSIONS ----------------------------------------------------
router.get("/me/submissions", requireStudent, mySubmissions)
router.get("/assignments/:id/submission", requireStudent, mySubmission)
router.put("/assignments/:id/submission", requireStudent, submit)
router.get("/assignments/:id/submissions", requireStaff, listSubmissions)
router.patch("/submissions/:id/grade", requireStaff, gradeSubmission)
router.get("/submissions/:id/file", requireAuth, downloadFile)

// QR CHECK-IN ----------------------------------------------------
router.post("/courses/:CourseId/checkin", requireStaff, openCheckin)
router.get("/sessions/:id/checkin", requireStaff, checkinStatus)
router.post("/sessions/:id/finish", requireStaff, finishCheckin)
router.post("/checkin", checkinLimiter, requireStudent, checkIn)

// TIMETABLE ------------------------------------------------------
router.put("/courses/:CourseId/schedule", requireAdmin, setSchedule)

module.exports = router
