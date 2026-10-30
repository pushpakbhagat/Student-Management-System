const express = require("express")
const router = express.Router();
const {
    handleNewAssignment,
    getAllAssignments,
    getAssignmentsByCourse,
    updateAssignment,
    deleteAssignment
} = require("../controllers/assignments")
const { requireAuth, requireAdmin } = require("../middlewares/auth")


router.get("/assignments", requireAuth, getAllAssignments)
router.get("/assignments/course/:courseId", requireAuth, getAssignmentsByCourse)
router.post('/assignments', requireAdmin, handleNewAssignment);
router.patch("/assignments/:id", requireAdmin, updateAssignment)
router.delete("/assignments/:id", requireAdmin, deleteAssignment)


module.exports = router;
