
const Student = require("../models/student");
const Course = require("../models/Courses")
const AttendanceSession = require("../models/AttendanceSession")
const Assessment = require("../models/Assessment")
const { hashPassword, normalizeEmail, isDemoAccount, CASE_INSENSITIVE } = require("../services/auth")
const { courseScope, teacherCourseIds } = require("../services/scope")
const { HttpError, assertValidId, pick, requireFields } = require("../utils/http")

// The only fields a client may set on a student. Courses, marks and attendance
// go through the course endpoints instead.
const STUDENT_FIELDS = ["firstName", "lastName", "gender", "email", "password", "imgURL"]

// NEW STUDENT --------------------------------------------------------------------
async function handleNewStudent(req, res) {
    const body = pick(req.body, STUDENT_FIELDS)
    requireFields(body, ["firstName", "lastName", "gender", "email", "password"])
    body.email = normalizeEmail(body.email)
    body.password = await hashPassword(body.password)

    const newStudent = await Student.create(body)
    return res.status(201).json(newStudent)
}

// UPDATE STUDENT -----------------------------------------------------------------
async function updateStudent(req, res) {
    const updates = pick(req.body, STUDENT_FIELDS)
    if (Object.keys(updates).length === 0) {
        throw new HttpError(400, "Nothing to update")
    }
    if (updates.email !== undefined) {
        updates.email = normalizeEmail(updates.email)
    }
    if (isDemoAccount({ email: req.params.email }) && (updates.email !== undefined || updates.password !== undefined)) {
        throw new HttpError(403, "The demo student's email and password can't be changed")
    }
    if (updates.password !== undefined) {
        updates.password = await hashPassword(updates.password)
        updates.passwordChangedAt = new Date()   // logs the student out everywhere
    }

    const student = await Student.findOneAndUpdate(
        { email: normalizeEmail(req.params.email) },
        updates,
        { returnDocument: "after", runValidators: true, collation: CASE_INSENSITIVE }
    )
    if (!student) {
        throw new HttpError(404, "Student not found")
    }
    return res.status(200).json(student)
}

// DELETE STUDENT -----------------------------------------------------------------
async function removeStudent(req, res) {
    const { id } = req.params
    assertValidId(id, "student id")

    const existing = await Student.findById(id, "email")
    if (isDemoAccount(existing)) {
        throw new HttpError(403, "The demo student can't be deleted")
    }

    const student = await Student.findByIdAndDelete(id);
    if (!student) {
        throw new HttpError(404, "Student not found")
    }

    // remove the student from every course roster, attendance record and gradebook too
    await Promise.all([
        Course.updateMany({ students: id }, { $pull: { students: id } }),
        AttendanceSession.updateMany({ "records.student": id }, { $pull: { records: { student: id } } }),
        Assessment.updateMany({ "scores.student": id }, { $pull: { scores: { student: id } } }),
    ])

    return res.status(200).json({ status: "deleted", student });
}

// ALL STUDENTS -------------------------------------------------------------------
// Teachers get only the students in their courses
async function handleGetAllStudents(req, res) {
    const scope = await courseScope(req.user)
    const students = await Student.find(scope ? { "courses.course": scope } : {}).sort({ createdAt: -1 });
    return res.status(200).json(students);
}

// Admins can look up anyone, teachers their own students, students themselves
async function getStudentByEmail(req, res) {
    const email = normalizeEmail(req.params.email)
    if (req.user.role === "student" && normalizeEmail(req.user.email) !== email) {
        throw new HttpError(403, "You can only view your own profile")
    }

    const student = await Student.findOne({ email }).collation(CASE_INSENSITIVE);
    if (!student) {
        throw new HttpError(404, "Student not found")
    }
    if (req.user.role === "teacher") {
        const mine = (await teacherCourseIds(req.user.id)).map(String)
        if (!student.courses.some(c => mine.includes(String(c.course)))) {
            throw new HttpError(403, "This student isn't in any of your courses")
        }
    }
    return res.status(200).json(student);
}

module.exports = {
    handleNewStudent,
    updateStudent,
    removeStudent,
    handleGetAllStudents,
    getStudentByEmail,
}
