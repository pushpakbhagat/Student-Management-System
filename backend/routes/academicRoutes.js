const express = require("express")
const { listSessions, createSession, updateSession, deleteSession, myAttendance } = require("../controllers/attendance")
const { listAssessments, createAssessment, updateAssessment, setScores, deleteAssessment, myGrades } = require("../controllers/grades")
const { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require("../controllers/announcements")
const { requireStaff, requireRole } = require("../middlewares/auth")

const router = express.Router()
const requireStudent = requireRole("student")
const requireSignedIn = requireRole("admin", "teacher", "student")

// ATTENDANCE (one session per course per day) -----------------
router.get("/courses/:CourseId/sessions", requireStaff, listSessions)
router.post("/courses/:CourseId/sessions", requireStaff, createSession)
router.patch("/sessions/:id", requireStaff, updateSession)
router.delete("/sessions/:id", requireStaff, deleteSession)
router.get("/me/attendance", requireStudent, myAttendance)

// GRADES ------------------------------------------------------
router.get("/courses/:CourseId/assessments", requireStaff, listAssessments)
router.post("/courses/:CourseId/assessments", requireStaff, createAssessment)
router.patch("/assessments/:id", requireStaff, updateAssessment)
router.put("/assessments/:id/scores", requireStaff, setScores)
router.delete("/assessments/:id", requireStaff, deleteAssessment)
router.get("/me/grades", requireStudent, myGrades)

// ANNOUNCEMENTS -----------------------------------------------
router.get("/announcements", requireSignedIn, listAnnouncements)
router.post("/announcements", requireStaff, createAnnouncement)
router.patch("/announcements/:id", requireStaff, updateAnnouncement)
router.delete("/announcements/:id", requireStaff, deleteAnnouncement)

module.exports = router
