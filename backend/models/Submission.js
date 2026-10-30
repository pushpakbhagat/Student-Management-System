const mongoose = require("mongoose")

// A student's hand-in for one assignment: a written answer and/or one small file.
// Files are kept in MongoDB (no extra storage service); the API never sends them inline.
const SubmissionSchema = new mongoose.Schema({
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    text: { type: String, trim: true, maxlength: 5000 },
    file: {
        name: { type: String, maxlength: 200 },
        // spelled out because a bare `type: String` here would make Mongoose treat `file` itself as a string
        type: { type: String },
        size: Number,
        data: { type: Buffer, select: false },
    },
    submittedAt: { type: Date, default: Date.now },
    late: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 100 },
    feedback: { type: String, trim: true, maxlength: 2000 },
    gradedAt: Date,
}, { timestamps: true })

SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true })

module.exports = mongoose.model("Submission", SubmissionSchema)
