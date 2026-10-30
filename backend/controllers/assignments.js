const Course = require("../models/Courses")
const Assignment = require("../models/Assignment")
const { HttpError, assertValidId, pick } = require("../utils/http")

// CREATE ASSIGNMENT
async function handleNewAssignment(req, res) {
    const { CourseId, title, description, dueDate } = req.body ?? {}

    if (!CourseId || !title || !dueDate) {
        throw new HttpError(400, "Course, title and due date are required")
    }
    assertValidId(CourseId, "course id")

    const course = await Course.findById(CourseId)
    if (!course) {
        throw new HttpError(404, "Course not found")
    }

    const assignment = await Assignment.create({
        title,
        description,
        dueDate,
        course: CourseId
    })
    await Course.updateOne({ _id: CourseId }, { $addToSet: { assignments: assignment._id } })

    return res.status(201).json({
        msg: "Assignment added successfully",
        assignment
    })
}


// Students only ever see assignments for courses they are enrolled in
function isEnrolledIn(account, courseId) {
    return account.courses.some(c => c.course?.toString() === courseId.toString())
}

// GET ALL ASSIGNMENTS
async function getAllAssignments(req, res) {
    const filter = req.user.role === "admin"
        ? {}
        : { course: { $in: req.account.courses.map(c => c.course) } }

    const assignments = await Assignment.find(filter)
        .populate("course", "courseName")
        .sort({ dueDate: 1 })
    return res.status(200).json({ assignments })
}


// GET ASSIGNMENTS BY COURSE
async function getAssignmentsByCourse(req, res) {
    const { courseId } = req.params
    assertValidId(courseId, "course id")
    if (req.user.role !== "admin" && !isEnrolledIn(req.account, courseId)) {
        throw new HttpError(403, "You are not enrolled in this course")
    }

    const assignments = await Assignment.find({ course: courseId }).sort({ dueDate: 1 })
    return res.status(200).json({ assignments })
}


// UPDATE ASSIGNMENT
async function updateAssignment(req, res) {
    const { id } = req.params
    assertValidId(id, "assignment id")

    const updates = pick(req.body, ["title", "description", "dueDate"])
    const assignment = await Assignment.findByIdAndUpdate(
        id,
        updates,
        { returnDocument: "after", runValidators: true }
    )
    if (!assignment) {
        throw new HttpError(404, "Assignment not found")
    }

    return res.status(200).json({
        msg: "Assignment updated",
        assignment
    })
}


// DELETE ASSIGNMENT
async function deleteAssignment(req, res) {
    const { id } = req.params
    assertValidId(id, "assignment id")

    const assignment = await Assignment.findByIdAndDelete(id)
    if (!assignment) {
        throw new HttpError(404, "Assignment not found")
    }

    await Course.updateOne(
        { _id: assignment.course },
        { $pull: { assignments: assignment._id } }
    )

    return res.status(200).json({ msg: "Assignment deleted" })
}

module.exports = {
    handleNewAssignment,
    getAllAssignments,
    getAssignmentsByCourse,
    updateAssignment,
    deleteAssignment
}
