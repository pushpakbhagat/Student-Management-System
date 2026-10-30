const mongoose = require("mongoose")

const CourseSchema = new mongoose.Schema({


    courseName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 100,
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
    }], 

    assignments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment"
    }],

    // staff with role "teacher" who manage this course
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin"
    }],

    // weekly timetable: day 0 = Sunday … 6 = Saturday, times as "HH:MM"
    schedule: [{
        _id: false,
        day: { type: Number, min: 0, max: 6, required: true },
        start: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
        end: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
        room: { type: String, trim: true, maxlength: 40 },
    }],
}, {timestamps: true})


const Course = mongoose.model("Course", CourseSchema)

module.exports = Course