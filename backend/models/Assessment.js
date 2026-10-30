const mongoose = require("mongoose")

const KINDS = ["quiz", "assignment", "midterm", "final", "project", "other"]

// Something graded in a course (a quiz, the final exam …) and every student's score on it
const AssessmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    kind: {
        type: String,
        enum: KINDS,
        default: "quiz",
    },
    maxScore: {
        type: Number,
        required: true,
        min: [1, "Max score must be at least 1"],
        max: 1000,
    },
    // share of the course grade, in percent (weights are normalised, so they don't have to add up to 100)
    weight: {
        type: Number,
        required: true,
        min: [0, "Weight can't be negative"],
        max: [100, "Weight can be at most 100"],
    },
    date: Date,
    scores: [
        {
            _id: false,
            student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
            score: { type: Number, required: true, min: 0 },
        },
    ],
}, { timestamps: true })

const Assessment = mongoose.model("Assessment", AssessmentSchema)

module.exports = Assessment
module.exports.KINDS = KINDS
