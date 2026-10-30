const mongoose = require("mongoose")

const AssignmentSchema = new mongoose.Schema({

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    dueDate: Date
},{timestamps: true})


// Model name must match the ref: "Assignment" used in Courses.js (collection stays "assignments")
const Assignment = mongoose.model("Assignment", AssignmentSchema);

module.exports = Assignment
