const mongoose = require("mongoose")

const STATUSES = ["present", "late", "absent", "excused"]

// One class on one day: who was there. The per-student totals on Student.courses are
// kept in sync with these records (see services/attendance.js).
const AttendanceSessionSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    // the calendar day, stored as midnight UTC
    date: {
        type: Date,
        required: true,
    },
    topic: {
        type: String,
        trim: true,
        maxlength: 200,
    },
    // true while a live QR check-in is running for this class
    checkinOpen: {
        type: Boolean,
        default: false,
    },
    records: [
        {
            _id: false,
            student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
            status: { type: String, enum: STATUSES, required: true },
        },
    ],
}, { timestamps: true })

// one session per course per day
AttendanceSessionSchema.index({ course: 1, date: 1 }, { unique: true })

const AttendanceSession = mongoose.model("AttendanceSession", AttendanceSessionSchema)

module.exports = AttendanceSession
module.exports.STATUSES = STATUSES
