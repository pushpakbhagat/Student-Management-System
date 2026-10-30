
const express = require("express")
const router = express.Router();
const {
    handleNewCourse,
    getAllCourses,
    deleteCourse,
    enrollStudentInCourse,
    enrollStudentInMultipleCourses,
    enrollMultipleStudentsInSingleCourse,
    unenrollStudent,
} = require("../controllers/courses")
const { requireAuth, requireAdmin } = require("../middlewares/auth")


// Routes -----------------------------------------------------

router.get('/courses', requireAuth, getAllCourses)
router.post('/courses', requireAdmin, handleNewCourse)
router.delete('/courses/:CourseId', requireAdmin, deleteCourse)
router.post('/enrollcourse', requireAdmin, enrollStudentInCourse)
router.patch('/enrollmultiplecourses', requireAdmin, enrollStudentInMultipleCourses)
router.patch('/enrollmultiplestudents', requireAdmin, enrollMultipleStudentsInSingleCourse)
router.delete('/courses/:CourseId/students/:StudentId', requireAdmin, unenrollStudent)


module.exports = router
