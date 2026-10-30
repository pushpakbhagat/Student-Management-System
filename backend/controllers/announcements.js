const Course = require("../models/Courses")
const Announcement = require("../models/Announcement")
const { HttpError, assertValidId, pick } = require("../utils/http")

function withDetails(query) {
    return query
        .populate("course", "courseName")
        .populate("author", "firstName lastName imgURL email")
        .sort({ pinned: -1, createdAt: -1 })
}

// Admins see everything; students see school-wide notices plus their own courses'
async function listAnnouncements(req, res) {
    const filter = req.user.role === "admin"
        ? {}
        : { $or: [{ course: null }, { course: { $in: req.account.courses.map(c => c.course) } }] }
    const announcements = await withDetails(Announcement.find(filter)).limit(100)
    return res.status(200).json({ announcements })
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
    body.pinned = Boolean(body.pinned)

    const created = await Announcement.create({ ...body, author: req.user.id })
    const announcement = await withDetails(Announcement.findById(created._id))
    return res.status(201).json({ announcement })
}

async function updateAnnouncement(req, res) {
    const { id } = req.params
    assertValidId(id, "announcement id")
    const updates = pick(req.body, ["title", "body", "pinned"])
    const updated = await Announcement.findByIdAndUpdate(id, updates, { returnDocument: "after", runValidators: true })
    if (!updated) throw new HttpError(404, "Announcement not found")
    const announcement = await withDetails(Announcement.findById(id))
    return res.status(200).json({ announcement })
}

async function deleteAnnouncement(req, res) {
    const { id } = req.params
    assertValidId(id, "announcement id")
    const deleted = await Announcement.findByIdAndDelete(id)
    if (!deleted) throw new HttpError(404, "Announcement not found")
    return res.status(200).json({ msg: "Announcement deleted" })
}

module.exports = { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement }
