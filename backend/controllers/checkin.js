const Course = require("../models/Courses")
const Student = require("../models/student")
const AttendanceSession = require("../models/AttendanceSession")
const { applyCounterChanges, parseDay } = require("../services/attendance")
const { makeToken, readToken } = require("../services/checkin")
const { assertCourseAccess } = require("../services/scope")
const { HttpError, assertValidId } = require("../utils/http")

async function enrolled(courseId) {
    return Student.find({ "courses.course": courseId }, "firstName lastName email imgURL")
}

async function loadSession(id, user) {
    assertValidId(id, "session id")
    const session = await AttendanceSession.findById(id)
    if (!session) throw new HttpError(404, "Attendance record not found")
    if (user) await assertCourseAccess(user, session.course)
    return session
}

// STAFF: open (or reopen) today's live check-in. Body: { date: "YYYY-MM-DD" } in the teacher's time zone.
async function openCheckin(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")
    if (!await Course.exists({ _id: CourseId })) throw new HttpError(404, "Course not found")
    await assertCourseAccess(req.user, CourseId)
    const date = parseDay(req.body?.date)
    if (!date) throw new HttpError(400, "Pick a valid date")

    const session = await AttendanceSession.findOneAndUpdate(
        { course: CourseId, date },
        { $set: { checkinOpen: true }, $setOnInsert: { records: [] } },
        { upsert: true, returnDocument: "after" }
    )
    return res.status(200).json({ session, ...makeToken(session._id), roster: await enrolled(CourseId) })
}

// STAFF: poll every few seconds for a fresh code and who has checked in
async function checkinStatus(req, res) {
    const session = await loadSession(req.params.id, req.user)
    return res.status(200).json({ session, ...(session.checkinOpen ? makeToken(session._id) : {}) })
}

// STAFF: close check-in; everyone enrolled who didn't check in is marked absent
async function finishCheckin(req, res) {
    const session = await loadSession(req.params.id, req.user)
    const roster = await enrolled(session.course)
    const marked = new Set(session.records.map(r => String(r.student)))
    const absent = roster.filter(s => !marked.has(String(s._id))).map(s => ({ student: s._id, status: "absent" }))

    session.records.push(...absent)
    session.checkinOpen = false
    await session.save()
    await applyCounterChanges(session.course, [], absent)

    const students = await Student.find({ _id: { $in: roster.map(s => s._id) } })
    return res.status(200).json({ session, students, markedAbsent: absent.length })
}

// STUDENT: scan the code
async function checkIn(req, res) {
    const sessionId = readToken(req.body?.token)
    if (!sessionId) throw new HttpError(400, "That code has expired. Scan the screen again.")
    const session = await AttendanceSession.findById(sessionId).populate("course", "courseName")
    if (!session || !session.checkinOpen) throw new HttpError(400, "Check-in for this class is closed")

    const courseId = session.course._id
    if (!req.account.courses.some(c => String(c.course) === String(courseId))) {
        throw new HttpError(403, "You aren't enrolled in this course")
    }

    const existing = session.records.find(r => String(r.student) === String(req.account._id))
    if (existing && (existing.status === "present" || existing.status === "late")) {
        return res.status(200).json({ status: existing.status, already: true, course: session.course, date: session.date })
    }

    const record = { student: req.account._id, status: "present" }
    const before = existing ? [{ student: existing.student, status: existing.status }] : []
    if (existing) existing.status = "present"
    else session.records.push(record)
    await session.save()
    await applyCounterChanges(courseId, before, [record])

    return res.status(200).json({ status: "present", already: false, course: session.course, date: session.date })
}

// ADMIN: set a course's weekly timetable
async function setSchedule(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")
    const schedule = req.body?.schedule
    if (!Array.isArray(schedule) || schedule.length > 20) throw new HttpError(400, "schedule must be a list of up to 20 slots")
    for (const slot of schedule) {
        if (!(slot?.start < slot?.end)) throw new HttpError(400, "Each class must end after it starts")
    }
    const course = await Course.findByIdAndUpdate(CourseId, { schedule }, { returnDocument: "after", runValidators: true })
    if (!course) throw new HttpError(404, "Course not found")
    return res.status(200).json({ course })
}

module.exports = { openCheckin, checkinStatus, finishCheckin, checkIn, setSchedule }
