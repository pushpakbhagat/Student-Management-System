const mongoose = require("mongoose")

// A notice for everyone (course: null) or for the students of one course
const AnnouncementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    body: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        default: null,
    },
    pinned: {
        type: Boolean,
        default: false,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
    },
}, { timestamps: true })

const Announcement = mongoose.model("Announcement", AnnouncementSchema)

module.exports = Announcement
