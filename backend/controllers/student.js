
const Student = require("../models/student");
const Course = require("../models/Courses")
const AttendanceSession = require("../models/AttendanceSession")
const Assessment = require("../models/Assessment")
const Submission = require("../models/Submission")
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
        Submission.deleteMany({ student: id }),
    ])

    return res.status(200).json({ status: "deleted", student });
}

// ALL STUDENTS -------------------------------------------------------------------
// Teachers get only the students in their courses.
// GET /students                         -> everyone the caller may see (an array)
// GET /students?page=&limit=&q=&course= -> one page: { students, total, page, pages, limit }
// `q` matches names and email; with several words ("rahul sha") each word has to match.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function handleGetAllStudents(req, res) {
    const scope = await courseScope(req.user)
    const filter = scope ? { "courses.course": scope } : {}
    const { page, limit, q, course } = req.query
    if ([page, limit, q, course].every(v => v === undefined)) {
        return res.status(200).json(await Student.find(filter).sort({ createdAt: -1 }))
    }

    if (course) {
        assertValidId(course, "course id")
        if (scope && !scope.$in.some(id => String(id) === course)) throw new HttpError(403, "You don't teach this course")
        filter["courses.course"] = course
    }
    const words = typeof q === "string" ? q.trim().split(/\s+/).filter(Boolean).slice(0, 5) : []
    if (words.length) {
        filter.$and = words.map(word => {
            const pattern = new RegExp(escapeRegex(word.slice(0, 50)), "i")
            return { $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }] }
        })
    }

    const size = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
    const total = await Student.countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / size))
    const current = Math.min(pages, Math.max(1, parseInt(page, 10) || 1))
    const students = await Student.find(filter).sort({ createdAt: -1, _id: -1 }).skip((current - 1) * size).limit(size)
    return res.status(200).json({ students, total, page: current, pages, limit: size })
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
