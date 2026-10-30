
const mongoose = require("mongoose")

const studentSchema = new mongoose.Schema({

    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },

    lastName: {
        type: String,
        trim: true,
        maxlength: 50,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
    },
    password: {
        type: String,
        required: true,
    },
    // tokens issued before this moment are rejected (set when the password changes)
    passwordChangedAt: {
        type: Date,
    },

    gender: {
        type: String,
        trim: true,
        maxlength: 30,
    },

    imgURL: {
        type: String,
        trim: true,
        maxlength: 2048,
        match: [/^(https?:\/\/\S+)?$/, "Photo URL must start with http:// or https://"],
    },

    courses: [
        {
            course: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Course",
            },

            totalClasses: {
                type: Number,
                default: 0,
                min: 0,
            },

            attendedClasses: {
                type: Number,
                default: 0,
                min: 0,
            },

            marks: {
                type: Number,
                default: 0,
                min: 0,
            }
        }
    ],
}, {
    timestamps: true,
    // never send the password hash back in a response
    toJSON: {
        transform: (doc, ret) => {
            delete ret.password
            delete ret.passwordChangedAt
            return ret
        },
    },
})


// Model name must match the ref: "Student" used in Courses.js (collection stays "students")
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
