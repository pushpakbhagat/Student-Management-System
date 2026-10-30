const Assessment = require("../models/Assessment")
const AttendanceSession = require("../models/AttendanceSession")
const { computeGrade, gpa, scoreOf } = require("./grades")

function pct(part, total) {
    return total > 0 ? Math.round((part / total) * 100) : 0
}

// Everything about one student's progress: attendance + grades per course, and GPA.
// `courseIds` limits it (e.g. to a teacher's courses); `student.courses.course` must be populated.
async function buildReport(student, courseIds = null) {
    const allowed = courseIds ? new Set(courseIds.map(String)) : null
    const enrollments = student.courses.filter(e => e.course && (!allowed || allowed.has(String(e.course._id))))
    const ids = enrollments.map(e => e.course._id)
    const assessments = await Assessment.find({ course: { $in: ids } }).sort({ date: 1, createdAt: 1 })

    const courses = enrollments.map(e => {
        const mine = assessments.filter(a => String(a.course) === String(e.course._id))
        return {
            course: { _id: e.course._id, courseName: e.course.courseName },
            attendance: { attended: e.attendedClasses, total: e.totalClasses, pct: pct(e.attendedClasses, e.totalClasses) },
            grade: computeGrade(mine, student._id),
            assessments: mine.map(a => ({
                _id: a._id, title: a.title, kind: a.kind, maxScore: a.maxScore, weight: a.weight, date: a.date,
                score: scoreOf(a, student._id) ?? null,
            })),
        }
    })

    const attended = courses.reduce((s, c) => s + c.attendance.attended, 0)
    const total = courses.reduce((s, c) => s + c.attendance.total, 0)
    return {
        student: { _id: student._id, firstName: student.firstName, lastName: student.lastName, email: student.email, gender: student.gender, imgURL: student.imgURL },
        generatedAt: new Date(),
        gpa: gpa(courses.map(c => c.grade)),
        attendance: { attended, total, pct: pct(attended, total) },
        courses,
    }
}

// For at-risk detection: was the student absent in each of the last `n` sessions of a course?
async function recentAbsenceStreaks(courseIds, n = 3) {
    const sessions = await AttendanceSession.find({ course: { $in: courseIds } }).sort({ date: -1 })
    const byCourse = new Map()
    for (const s of sessions) {
        const list = byCourse.get(String(s.course)) ?? []
        if (list.length < n) list.push(s)
        byCourse.set(String(s.course), list)
    }
    // studentId -> [courseId, ...] where they missed every one of the last n classes
    const streaks = new Map()
    for (const [courseId, list] of byCourse) {
        if (list.length < n) continue
        const students = new Set(list[0].records.map(r => String(r.student)))
        for (const sid of students) {
            const missedAll = list.every(s => s.records.find(r => String(r.student) === sid)?.status === "absent")
            if (missedAll) streaks.set(sid, [...(streaks.get(sid) ?? []), courseId])
        }
    }
    return streaks
}

module.exports = { buildReport, recentAbsenceStreaks, pct }
