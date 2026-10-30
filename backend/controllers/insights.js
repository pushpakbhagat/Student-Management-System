const Student = require("../models/student")
const Course = require("../models/Courses")
const Assessment = require("../models/Assessment")
const Assignment = require("../models/Assignment")
const Announcement = require("../models/Announcement")
const AttendanceSession = require("../models/AttendanceSession")
const { courseScope, teacherCourseIds } = require("../services/scope")
const { buildReport, recentAbsenceStreaks, pct } = require("../services/report")
const { computeGrade, letterFor } = require("../services/grades")
const { HttpError, assertValidId } = require("../utils/http")

const ATTENDANCE_TARGET = 75
const PASSING_GRADE = 60
const DAY = 86400000

async function scopedCourses(user) {
    const scope = await courseScope(user)
    return Course.find(scope ? { _id: scope } : {}, "courseName")
}

// AT-RISK STUDENTS --------------------------------------------------------------
// Simple, explainable rules - every flag comes with the reasons behind it.
async function computeAtRisk(user) {
    const courses = await scopedCourses(user)
    const courseIds = courses.map(c => c._id)
    const names = new Map(courses.map(c => [String(c._id), c.courseName]))
    const [students, assessments, streaks] = await Promise.all([
        Student.find({ "courses.course": { $in: courseIds } }),
        Assessment.find({ course: { $in: courseIds } }),
        recentAbsenceStreaks(courseIds),
    ])

    const flagged = []
    for (const s of students) {
        const reasons = []
        let severity = 0
        const mine = s.courses.filter(e => names.has(String(e.course)))

        const attended = mine.reduce((n, e) => n + e.attendedClasses, 0)
        const total = mine.reduce((n, e) => n + e.totalClasses, 0)
        const attendance = pct(attended, total)
        if (total >= 3 && attendance < ATTENDANCE_TARGET) {
            reasons.push(`Attendance is ${attendance}%`)
            severity += attendance < 60 ? 2 : 1
        }
        for (const e of mine) {
            const grade = computeGrade(assessments.filter(a => String(a.course) === String(e.course)), s._id)
            if (grade && grade.percent < PASSING_GRADE) {
                reasons.push(`Failing ${names.get(String(e.course))} (${grade.percent}%)`)
                severity += grade.percent < 50 ? 2 : 1
            }
        }
        for (const courseId of streaks.get(String(s._id)) ?? []) {
            reasons.push(`Missed the last 3 ${names.get(courseId)} classes`)
            severity += 1
        }
        if (reasons.length) {
            flagged.push({
                student: { _id: s._id, firstName: s.firstName, lastName: s.lastName, email: s.email, imgURL: s.imgURL },
                level: severity >= 2 ? "high" : "medium",
                severity,
                reasons,
            })
        }
    }
    return flagged.sort((a, b) => b.severity - a.severity)
}

async function atRisk(req, res) {
    return res.status(200).json({ students: await computeAtRisk(req.user) })
}

// CHART DATA ---------------------------------------------------------------------
async function overview(req, res) {
    const courses = await scopedCourses(req.user)
    const courseIds = courses.map(c => c._id)
    const since = new Date(Date.now() - 45 * DAY)
    const [sessions, assessments, students] = await Promise.all([
        AttendanceSession.find({ course: { $in: courseIds }, date: { $gte: since } }).sort({ date: 1 }),
        Assessment.find({ course: { $in: courseIds } }),
        Student.find({ "courses.course": { $in: courseIds } }, "courses"),
    ])

    // daily attendance across the caller's courses
    const byDay = new Map()
    for (const s of sessions) {
        const key = s.date.toISOString().slice(0, 10)
        const d = byDay.get(key) ?? { attended: 0, total: 0 }
        for (const r of s.records) {
            if (r.status === "excused") continue
            d.total += 1
            if (r.status === "present" || r.status === "late") d.attended += 1
        }
        byDay.set(key, d)
    }
    const attendanceTrend = [...byDay].slice(-20).map(([date, d]) => ({ date, pct: pct(d.attended, d.total) }))

    // letter grade per student per course, and per-course averages
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    const coursePerformance = courses.map(c => {
        const mine = assessments.filter(a => String(a.course) === String(c._id))
        const enrolled = students.filter(s => s.courses.some(e => String(e.course) === String(c._id)))
        const grades = enrolled.map(s => computeGrade(mine, s._id)).filter(Boolean)
        grades.forEach(g => { gradeDistribution[g.letter] += 1 })
        const att = enrolled.map(s => s.courses.find(e => String(e.course) === String(c._id)))
            .reduce((acc, e) => ({ a: acc.a + e.attendedClasses, t: acc.t + e.totalClasses }), { a: 0, t: 0 })
        const avg = grades.length ? Math.round(grades.reduce((n, g) => n + g.percent, 0) / grades.length) : null
        return {
            _id: c._id,
            courseName: c.courseName,
            averageGrade: avg,
            averageLetter: avg === null ? null : letterFor(avg).letter,
            attendance: att.t ? pct(att.a, att.t) : null,
        }
    })

    return res.status(200).json({ attendanceTrend, gradeDistribution, coursePerformance })
}

// REPORT CARDS -------------------------------------------------------------------
async function studentReport(req, res) {
    const { id } = req.params
    assertValidId(id, "student id")
    const student = await Student.findById(id).populate("courses.course", "courseName")
    if (!student) throw new HttpError(404, "Student not found")

    let courseIds = null
    if (req.user.role === "teacher") {
        courseIds = await teacherCourseIds(req.user.id)
        if (!student.courses.some(e => courseIds.some(c => String(c) === String(e.course?._id)))) {
            throw new HttpError(403, "This student isn't in any of your courses")
        }
    }
    return res.status(200).json({ report: await buildReport(student, courseIds) })
}

async function myReport(req, res) {
    await req.account.populate("courses.course", "courseName")
    return res.status(200).json({ report: await buildReport(req.account) })
}

// NOTIFICATIONS ------------------------------------------------------------------
// Worked out on the fly from the data, so nothing extra is stored.
async function notifications(req, res) {
    const items = []
    const now = Date.now()
    const soon = new Date(now + 3 * DAY)
    const recent = new Date(now - 14 * DAY)

    if (req.user.role === "student") {
        await req.account.populate("courses.course", "courseName")
        const enrollments = req.account.courses.filter(e => e.course)
        const ids = enrollments.map(e => e.course._id)
        const [due, news, graded] = await Promise.all([
            Assignment.find({ course: { $in: ids }, dueDate: { $gte: new Date(now - DAY), $lte: soon } }).populate("course", "courseName"),
            Announcement.find({ $or: [{ course: null }, { course: { $in: ids } }], createdAt: { $gte: recent } }),
            Assessment.find({ course: { $in: ids }, "scores.student": req.account._id, updatedAt: { $gte: recent } }).populate("course", "courseName"),
        ])
        for (const a of due) {
            items.push({ id: `due-${a._id}`, type: "due", title: `${a.title} is due soon`, body: a.course?.courseName, link: "/student/assignments", at: a.updatedAt })
        }
        for (const e of enrollments) {
            const p = pct(e.attendedClasses, e.totalClasses)
            if (e.totalClasses >= 3 && p < ATTENDANCE_TARGET) {
                items.push({ id: `att-${e.course._id}-${e.totalClasses}`, type: "attendance", title: `Attendance in ${e.course.courseName} is ${p}%`, body: `Aim for ${ATTENDANCE_TARGET}% to stay eligible.`, link: "/student/attendance", at: req.account.updatedAt })
            }
        }
        for (const a of news) {
            items.push({ id: `news-${a._id}`, type: "news", title: a.title, body: a.body?.slice(0, 120), link: "/student/announcements", at: a.createdAt })
        }
        for (const a of graded) {
            const score = a.scores.find(s => String(s.student) === String(req.account._id))?.score
            items.push({ id: `grade-${a._id}-${score}`, type: "grade", title: `${a.title} graded: ${score}/${a.maxScore}`, body: a.course?.courseName, link: "/student/grades", at: a.updatedAt })
        }
    } else {
        const courses = await scopedCourses(req.user)
        const ids = courses.map(c => c._id)
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        const isWeekday = today.getUTCDay() !== 0 && today.getUTCDay() !== 6
        const [risk, due, recordedToday, everRecorded] = await Promise.all([
            computeAtRisk(req.user),
            Assignment.find({ course: { $in: ids }, dueDate: { $gte: new Date(now - DAY), $lte: soon } }).populate("course", "courseName"),
            AttendanceSession.distinct("course", { course: { $in: ids }, date: today }),
            AttendanceSession.distinct("course", { course: { $in: ids } }),
        ])
        const high = risk.filter(r => r.level === "high").length
        if (risk.length) {
            items.push({ id: `risk-${risk.length}-${high}`, type: "risk", title: `${risk.length} student${risk.length === 1 ? " needs" : "s need"} attention`, body: high ? `${high} at high risk` : "Low attendance or grades", link: "/admin/dashboard", at: new Date() })
        }
        for (const a of due) {
            items.push({ id: `due-${a._id}`, type: "due", title: `${a.title} is due soon`, body: a.course?.courseName, link: "/admin/assignments", at: a.updatedAt })
        }
        if (isWeekday) {
            const done = new Set(recordedToday.map(String))
            for (const c of courses) {
                if (everRecorded.some(id => String(id) === String(c._id)) && !done.has(String(c._id))) {
                    items.push({ id: `todo-${c._id}-${today.toISOString().slice(0, 10)}`, type: "todo", title: `Today's ${c.courseName} attendance isn't recorded`, body: "Take it in a minute", link: "/admin/attendance", at: today })
                }
            }
        }
    }

    items.sort((a, b) => new Date(b.at) - new Date(a.at))
    return res.status(200).json({ notifications: items.slice(0, 30) })
}

module.exports = { atRisk, overview, studentReport, myReport, notifications, computeAtRisk }
