const express = require("express")
const router = express.Router();
const {
    handleNewAssignment,
    getAllAssignments,
    getAssignmentsByCourse,
    updateAssignment,
    deleteAssignment
} = require("../controllers/assignments")
const { requireAuth, requireStaff } = require("../middlewares/auth")


router.get("/assignments", requireAuth, getAllAssignments)
router.get("/assignments/course/:courseId", requireAuth, getAssignmentsByCourse)
router.post('/assignments', requireStaff, handleNewAssignment);
router.patch("/assignments/:id", requireStaff, updateAssignment)
router.delete("/assignments/:id", requireStaff, deleteAssignment)


module.exports = router;
