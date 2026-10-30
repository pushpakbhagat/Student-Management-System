const express = require("express")
const { listSessions, createSession, updateSession, deleteSession, myAttendance } = require("../controllers/attendance")
const { listAssessments, createAssessment, updateAssessment, setScores, deleteAssessment, myGrades } = require("../controllers/grades")
const { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require("../controllers/announcements")
const { requireAdmin, requireRole } = require("../middlewares/auth")

const router = express.Router()
const requireStudent = requireRole("student")
const requireSignedIn = requireRole("admin", "student")

// ATTENDANCE (one session per course per day) -----------------
router.get("/courses/:CourseId/sessions", requireAdmin, listSessions)
router.post("/courses/:CourseId/sessions", requireAdmin, createSession)
router.patch("/sessions/:id", requireAdmin, updateSession)
router.delete("/sessions/:id", requireAdmin, deleteSession)
router.get("/me/attendance", requireStudent, myAttendance)

// GRADES ------------------------------------------------------
router.get("/courses/:CourseId/assessments", requireAdmin, listAssessments)
router.post("/courses/:CourseId/assessments", requireAdmin, createAssessment)
router.patch("/assessments/:id", requireAdmin, updateAssessment)
router.put("/assessments/:id/scores", requireAdmin, setScores)
router.delete("/assessments/:id", requireAdmin, deleteAssessment)
router.get("/me/grades", requireStudent, myGrades)

// ANNOUNCEMENTS -----------------------------------------------
router.get("/announcements", requireSignedIn, listAnnouncements)
router.post("/announcements", requireAdmin, createAnnouncement)
router.patch("/announcements/:id", requireAdmin, updateAnnouncement)
router.delete("/announcements/:id", requireAdmin, deleteAnnouncement)

module.exports = router
