const Assignment = require("../models/Assignment")
const Submission = require("../models/Submission")
const Student = require("../models/student")
const { assertCourseAccess } = require("../services/scope")
const { HttpError, assertValidId } = require("../utils/http")

const MAX_FILE_BYTES = 2 * 1024 * 1024
// downloads are always served as attachments, and only these types are accepted
const ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

function publicView(s) {
    const json = s.toJSON()
    if (json.file) delete json.file.data
    return json
}

async function loadAssignment(id) {
    assertValidId(id, "assignment id")
    const assignment = await Assignment.findById(id)
    if (!assignment) throw new HttpError(404, "Assignment not found")
    return assignment
}

// STUDENT -----------------------------------------------------------------------
async function mySubmission(req, res) {
    const assignment = await loadAssignment(req.params.id)
    const submission = await Submission.findOne({ assignment: assignment._id, student: req.account._id })
    return res.status(200).json({ submission: submission ? publicView(submission) : null })
}

// All of the student's submissions (for the assignments list)
async function mySubmissions(req, res) {
    const submissions = await Submission.find({ student: req.account._id })
    return res.status(200).json({ submissions: submissions.map(publicView) })
}

// Body: { text?, file?: { name, type, data (base64) } }. Replaces an earlier hand-in until it's graded.
async function submit(req, res) {
    const assignment = await loadAssignment(req.params.id)
    if (!req.account.courses.some(c => String(c.course) === String(assignment.course))) {
        throw new HttpError(403, "You are not enrolled in this course")
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : ""
    let file
    if (req.body?.file) {
        const { name, type, data } = req.body.file
        if (!ALLOWED_TYPES[type]) throw new HttpError(400, "Upload a PDF, image, Word document or text file")
        if (typeof data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new HttpError(400, "The file couldn't be read")
        const buffer = Buffer.from(data, "base64")
        if (buffer.length > MAX_FILE_BYTES) throw new HttpError(400, "Files can be at most 2 MB")
        file = { name: String(name || `submission${ALLOWED_TYPES[type]}`).slice(0, 200), type, size: buffer.length, data: buffer }
    }
    if (!text && !file) throw new HttpError(400, "Write an answer or attach a file")

    const existing = await Submission.findOne({ assignment: assignment._id, student: req.account._id })
    if (existing?.gradedAt) throw new HttpError(409, "This submission has already been graded")

    const late = assignment.dueDate ? Date.now() > new Date(assignment.dueDate).getTime() + 86400000 : false
    const update = { text, submittedAt: new Date(), late, course: assignment.course }
    if (file) update.file = file
    else if (!existing?.file?.name) update.file = undefined

    const submission = await Submission.findOneAndUpdate(
        { assignment: assignment._id, student: req.account._id },
        { $set: update },
        { upsert: true, returnDocument: "after", runValidators: true }
    )
    return res.status(200).json({ submission: publicView(submission) })
}

// STAFF -------------------------------------------------------------------------
// Everyone in the course, with their submission (if any)
async function listSubmissions(req, res) {
    const assignment = await loadAssignment(req.params.id)
    await assertCourseAccess(req.user, assignment.course)

    const [students, submissions] = await Promise.all([
        Student.find({ "courses.course": assignment.course }, "firstName lastName email imgURL").sort({ firstName: 1 }),
        Submission.find({ assignment: assignment._id }),
    ])
    const byStudent = new Map(submissions.map(s => [String(s.student), publicView(s)]))
    return res.status(200).json({
        rows: students.map(s => ({ student: s, submission: byStudent.get(String(s._id)) ?? null })),
    })
}

async function gradeSubmission(req, res) {
    const { id } = req.params
    assertValidId(id, "submission id")
    const submission = await Submission.findById(id)
    if (!submission) throw new HttpError(404, "Submission not found")
    await assertCourseAccess(req.user, submission.course)

    const score = Number(req.body?.score)
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new HttpError(400, "Score must be between 0 and 100")
    submission.score = score
    submission.feedback = typeof req.body?.feedback === "string" ? req.body.feedback : submission.feedback
    submission.gradedAt = new Date()
    await submission.save()
    return res.status(200).json({ submission: publicView(submission) })
}

// Owner student, or staff who teach the course
async function downloadFile(req, res) {
    const { id } = req.params
    assertValidId(id, "submission id")
    const submission = await Submission.findById(id).select("+file.data")
    if (!submission?.file?.data) throw new HttpError(404, "No file attached")

    if (req.user.role === "student") {
        if (String(submission.student) !== req.user.id) throw new HttpError(403, "Not your submission")
    } else {
        await assertCourseAccess(req.user, submission.course)
    }

    res.set("Content-Type", submission.file.type)
    res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(submission.file.name)}"`)
    return res.send(submission.file.data)
}

module.exports = { mySubmission, mySubmissions, submit, listSubmissions, gradeSubmission, downloadFile, MAX_FILE_BYTES }
