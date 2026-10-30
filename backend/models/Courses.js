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
}, {timestamps: true})


const Course = mongoose.model("Course", CourseSchema)

module.exports = Course