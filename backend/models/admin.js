const mongoose = require("mongoose")

// Staff accounts: full admins, and teachers who only manage the courses assigned to them
const adminSchema = new mongoose.Schema({

    // accounts created before teachers existed have no role and count as admins
    role: {
        type: String,
        enum: ["admin", "teacher"],
        default: "admin",
    },

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
        // a web address, or a small uploaded photo stored inline (the browser resizes it first)
        maxlength: 300000,
        match: [/^(https?:\/\/\S+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$/, "Photo must be a web address or an uploaded image"],
    },
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


const Admin = mongoose.model("Admin", adminSchema)

module.exports = Admin;
