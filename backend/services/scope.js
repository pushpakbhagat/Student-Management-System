const Course = require("../models/Courses")
const { HttpError } = require("../utils/http")

// What a staff member may see: admins everything, teachers only their own courses.

async function teacherCourseIds(teacherId) {
    const courses = await Course.find({ teachers: teacherId }, "_id")
    return courses.map(c => c._id)
}

// Mongo filter on a `course` field for the caller (null = no restriction)
async function courseScope(user) {
    if (user.role === "admin") return null
    if (user.role === "teacher") return { $in: await teacherCourseIds(user.id) }
    return { $in: [] }
}

// Throws 403 unless the caller may manage this course
async function assertCourseAccess(user, courseId) {
    if (user.role === "admin") return
    if (user.role === "teacher" && await Course.exists({ _id: courseId, teachers: user.id })) return
    throw new HttpError(403, "You don't teach this course")
}

module.exports = { teacherCourseIds, courseScope, assertCourseAccess }
