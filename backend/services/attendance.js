const Student = require("../models/student")

// How one record counts towards a student's totals. Excused absences don't count at all.
function contribution(status) {
    return {
        total: status === "excused" ? 0 : 1,
        attended: status === "present" || status === "late" ? 1 : 0,
    }
}

// Keeps Student.courses[].totalClasses / attendedClasses in step with session records.
// Works on the difference between the old and new records, so totals recorded before
// dated sessions existed are preserved.
async function applyCounterChanges(courseId, before = [], after = []) {
    const delta = new Map()
    const add = (records, sign) => {
        for (const record of records) {
            const key = String(record.student)
            const c = contribution(record.status)
            const d = delta.get(key) ?? { total: 0, attended: 0 }
            d.total += sign * c.total
            d.attended += sign * c.attended
            delta.set(key, d)
        }
    }
    add(before, -1)
    add(after, +1)

    const ops = []
    for (const [studentId, d] of delta) {
        if (!d.total && !d.attended) continue
        ops.push({
            updateOne: {
                filter: { _id: studentId, "courses.course": courseId },
                update: { $inc: { "courses.$.totalClasses": d.total, "courses.$.attendedClasses": d.attended } },
            },
        })
    }
    if (ops.length) await Student.bulkWrite(ops)
}

// "2026-10-30" → Date at midnight UTC (so the day never shifts with time zones)
function parseDay(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const date = new Date(`${value}T00:00:00.000Z`)
    return Number.isNaN(date.getTime()) ? null : date
}

module.exports = { contribution, applyCounterChanges, parseDay }
