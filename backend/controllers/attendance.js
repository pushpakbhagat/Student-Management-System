const Course = require("../models/Courses")
const Student = require("../models/student")
const AttendanceSession = require("../models/AttendanceSession")
const { STATUSES } = require("../models/AttendanceSession")
const { applyCounterChanges, parseDay } = require("../services/attendance")
const { HttpError, assertValidId } = require("../utils/http")

async function enrolledIds(courseId) {
    const students = await Student.find({ "courses.course": courseId }, "_id")
    return new Set(students.map(s => s._id.toString()))
}

// Keeps only valid records for students in the course, one per student
async function cleanRecords(courseId, records) {
    if (!Array.isArray(records) || records.length === 0) {
        throw new HttpError(400, "Mark at least one student")
    }
    const allowed = await enrolledIds(courseId)
    const byStudent = new Map()
    for (const r of records) {
        if (!allowed.has(String(r?.student))) continue
        if (!STATUSES.includes(r.status)) throw new HttpError(400, `Status must be one of: ${STATUSES.join(", ")}`)
        byStudent.set(String(r.student), { student: r.student, status: r.status })
    }
    if (byStudent.size === 0) throw new HttpError(400, "None of those students are enrolled in this course")
    return [...byStudent.values()]
}

// students whose totals changed, so the admin screens can refresh them
function touchedStudents(...recordLists) {
    const ids = new Set(recordLists.flat().map(r => String(r.student)))
    return Student.find({ _id: { $in: [...ids] } })
}

async function listSessions(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")
    const sessions = await AttendanceSession.find({ course: CourseId }).sort({ date: -1 })
    return res.status(200).json({ sessions })
}

async function createSession(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")
    if (!await Course.exists({ _id: CourseId })) throw new HttpError(404, "Course not found")

    const date = parseDay(req.body?.date)
    if (!date) throw new HttpError(400, "Pick a valid date")
    const records = await cleanRecords(CourseId, req.body?.records)

    let session
    try {
        session = await AttendanceSession.create({ course: CourseId, date, topic: req.body?.topic, records })
    } catch (err) {
        if (err.code === 11000) throw new HttpError(409, "Attendance for that day already exists. Edit it instead.")
        throw err
    }
    await applyCounterChanges(CourseId, [], records)

    return res.status(201).json({ session, students: await touchedStudents(records) })
}

async function updateSession(req, res) {
    const { id } = req.params
    assertValidId(id, "session id")
    const session = await AttendanceSession.findById(id)
    if (!session) throw new HttpError(404, "Attendance record not found")

    const before = session.records.map(r => ({ student: r.student, status: r.status }))
    const records = await cleanRecords(session.course, req.body?.records)
    session.records = records
    if (req.body?.topic !== undefined) session.topic = req.body.topic
    await session.save()
    await applyCounterChanges(session.course, before, records)

    return res.status(200).json({ session, students: await touchedStudents(before, records) })
}

async function deleteSession(req, res) {
    const { id } = req.params
    assertValidId(id, "session id")
    const session = await AttendanceSession.findByIdAndDelete(id)
    if (!session) throw new HttpError(404, "Attendance record not found")

    await applyCounterChanges(session.course, session.records, [])
    return res.status(200).json({ msg: "Attendance record deleted", students: await touchedStudents(session.records) })
}

// A student's own day-by-day history across their courses
async function myAttendance(req, res) {
    const me = req.account._id
    const courseIds = req.account.courses.map(c => c.course)
    const sessions = await AttendanceSession.find({ course: { $in: courseIds }, "records.student": me })
        .populate("course", "courseName")
        .sort({ date: -1 })

    const history = sessions.map(s => ({
        _id: s._id,
        course: s.course,
        date: s.date,
        topic: s.topic,
        status: s.records.find(r => String(r.student) === String(me))?.status,
    }))
    return res.status(200).json({ history })
}

module.exports = { listSessions, createSession, updateSession, deleteSession, myAttendance }
