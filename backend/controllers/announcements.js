const Course = require("../models/Courses")
const Announcement = require("../models/Announcement")
const { assertCourseAccess, teacherCourseIds } = require("../services/scope")
const { HttpError, assertValidId, pick } = require("../utils/http")

function withDetails(query) {
    return query
        .populate("course", "courseName")
        .populate("author", "firstName lastName imgURL email")
        .sort({ pinned: -1, createdAt: -1 })
}

// Admins see everything; teachers and students see school-wide notices plus their own courses'
async function listAnnouncements(req, res) {
    let filter = {}
    if (req.user.role === "teacher") {
        filter = { $or: [{ course: null }, { course: { $in: await teacherCourseIds(req.user.id) } }] }
    } else if (req.user.role === "student") {
        filter = { $or: [{ course: null }, { course: { $in: req.account.courses.map(c => c.course) } }] }
    }
    const announcements = await withDetails(Announcement.find(filter)).limit(100)
    return res.status(200).json({ announcements })
}

// Teachers may only post to, and edit, the courses they teach (not school-wide notices)
async function assertCanManage(user, courseId) {
    if (user.role === "admin") return
    if (!courseId) throw new HttpError(403, "Only admins can post to everyone. Pick one of your courses.")
    await assertCourseAccess(user, courseId)
}

async function createAnnouncement(req, res) {
    const body = pick(req.body, ["title", "body", "course", "pinned"])
    if (!body.title?.trim?.()) throw new HttpError(400, "Give the announcement a title")
    if (body.course) {
        assertValidId(body.course, "course id")
        if (!await Course.exists({ _id: body.course })) throw new HttpError(404, "Course not found")
    } else {
        body.course = null
    }
    await assertCanManage(req.user, body.course)
    body.pinned = Boolean(body.pinned)

    const created = await Announcement.create({ ...body, author: req.user.id })
    const announcement = await withDetails(Announcement.findById(created._id))
    return res.status(201).json({ announcement })
}

async function updateAnnouncement(req, res) {
    const { id } = req.params
    assertValidId(id, "announcement id")
    const existing = await Announcement.findById(id)
    if (!existing) throw new HttpError(404, "Announcement not found")
    await assertCanManage(req.user, existing.course)

    Object.assign(existing, pick(req.body, ["title", "body", "pinned"]))
    await existing.save()
    const announcement = await withDetails(Announcement.findById(id))
    return res.status(200).json({ announcement })
}

async function deleteAnnouncement(req, res) {
    const { id } = req.params
    assertValidId(id, "announcement id")
    const existing = await Announcement.findById(id)
    if (!existing) throw new HttpError(404, "Announcement not found")
    await assertCanManage(req.user, existing.course)
    await existing.deleteOne()
    return res.status(200).json({ msg: "Announcement deleted" })
}

module.exports = { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement }
