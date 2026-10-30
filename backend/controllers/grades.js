const Course = require("../models/Courses")
const Student = require("../models/student")
const Assessment = require("../models/Assessment")
const { computeGrade, gpa, scoreOf } = require("../services/grades")
const { HttpError, assertValidId, pick } = require("../utils/http")

const FIELDS = ["title", "kind", "maxScore", "weight", "date"]

async function listAssessments(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")
    const assessments = await Assessment.find({ course: CourseId }).sort({ date: 1, createdAt: 1 })
    return res.status(200).json({ assessments })
}

async function createAssessment(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")
    if (!await Course.exists({ _id: CourseId })) throw new HttpError(404, "Course not found")

    const body = pick(req.body, FIELDS)
    if (!body.title || body.maxScore === undefined || body.weight === undefined) {
        throw new HttpError(400, "Title, max score and weight are required")
    }
    const assessment = await Assessment.create({ ...body, course: CourseId })
    return res.status(201).json({ assessment })
}

async function updateAssessment(req, res) {
    const { id } = req.params
    assertValidId(id, "assessment id")
    const assessment = await Assessment.findById(id)
    if (!assessment) throw new HttpError(404, "Assessment not found")

    Object.assign(assessment, pick(req.body, FIELDS))
    if (assessment.scores.some(s => s.score > assessment.maxScore)) {
        throw new HttpError(400, "Some scores are higher than the new max score")
    }
    await assessment.save()
    return res.status(200).json({ assessment })
}

// Body: { scores: [{ student, score }] } - score null/"" clears that student's score
async function setScores(req, res) {
    const { id } = req.params
    assertValidId(id, "assessment id")
    const assessment = await Assessment.findById(id)
    if (!assessment) throw new HttpError(404, "Assessment not found")
    if (!Array.isArray(req.body?.scores)) throw new HttpError(400, "scores must be a list")

    const enrolled = new Set((await Student.find({ "courses.course": assessment.course }, "_id")).map(s => String(s._id)))
    const current = new Map(assessment.scores.map(s => [String(s.student), s.score]))

    for (const entry of req.body.scores) {
        const sid = String(entry?.student)
        if (!enrolled.has(sid)) continue
        if (entry.score === null || entry.score === "") {
            current.delete(sid)
            continue
        }
        const score = Number(entry.score)
        if (!Number.isFinite(score) || score < 0 || score > assessment.maxScore) {
            throw new HttpError(400, `Scores must be between 0 and ${assessment.maxScore}`)
        }
        current.set(sid, score)
    }

    assessment.scores = [...current].map(([student, score]) => ({ student, score }))
    await assessment.save()
    return res.status(200).json({ assessment })
}

async function deleteAssessment(req, res) {
    const { id } = req.params
    assertValidId(id, "assessment id")
    const assessment = await Assessment.findByIdAndDelete(id)
    if (!assessment) throw new HttpError(404, "Assessment not found")
    return res.status(200).json({ msg: "Assessment deleted" })
}

// A student's grades in every course, with each assessment's score
async function myGrades(req, res) {
    const me = req.account._id
    await req.account.populate("courses.course", "courseName")
    const courseIds = req.account.courses.map(c => c.course?._id).filter(Boolean)
    const assessments = await Assessment.find({ course: { $in: courseIds } }).sort({ date: 1, createdAt: 1 })

    const courses = req.account.courses
        .filter(c => c.course)
        .map(c => {
            const mine = assessments.filter(a => String(a.course) === String(c.course._id))
            return {
                course: c.course,
                grade: computeGrade(mine, me),
                assessments: mine.map(a => ({
                    _id: a._id, title: a.title, kind: a.kind, maxScore: a.maxScore,
                    weight: a.weight, date: a.date, score: scoreOf(a, me) ?? null,
                })),
            }
        })

    return res.status(200).json({ courses, gpa: gpa(courses.map(c => c.grade)) })
}

module.exports = { listAssessments, createAssessment, updateAssessment, setScores, deleteAssessment, myGrades }
