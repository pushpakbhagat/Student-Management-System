
const express = require("express")
const { handleNewStudent, removeStudent, handleGetAllStudents, getStudentByEmail, updateStudent } = require("../controllers/student")
const { requireAuth, requireAdmin } = require("../middlewares/auth")

const router = express.Router()

// ROUTES ------------------------------------------------
    router.post('/students', requireAdmin, handleNewStudent)
    router.get('/students', requireAdmin, handleGetAllStudents)
    router.get('/students/email/:email', requireAuth, getStudentByEmail)
    router.patch('/students/:email', requireAdmin, updateStudent)
    router.delete('/students/:id', requireAdmin, removeStudent)

module.exports = router;
