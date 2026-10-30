const bcrypt = require("bcrypt")
const Student = require("../models/student")
const Admin = require("../models/admin")
const Course = require("../models/Courses")
const Assignment = require("../models/Assignment")
const {
    generateToken,
    findAccountForToken,
    setAuthCookie,
    clearAuthCookie,
    hashPassword,
    modelForRole,
    normalizeEmail,
    findByEmail,
    COOKIE_NAME,
} = require("../services/auth")
const { HttpError, pick, requireFields } = require("../utils/http")

const ADMIN_FIELDS = ["firstName", "lastName", "gender", "email", "password", "imgURL"]

// LOGIN --------------------------------------------------------------------------
async function handleLogin(req, res) {
    const { email, password, role } = req.body ?? {}

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
        throw new HttpError(400, "Email and password are required")
    }
    const Model = modelForRole(role)
    if (!Model) {
        throw new HttpError(400, "Choose whether you are signing in as a student or an admin")
    }

    const user = await findByEmail(Model, email)
    const isMatch = user && await bcrypt.compare(password, user.password)
    // same message for "no user" and "wrong password" so nobody can probe which emails exist
    if (!isMatch) {
        throw new HttpError(401, "Wrong email or password")
    }

    setAuthCookie(res, generateToken(user, role))

    if (role === "student") {
        return res.status(200).json({ student: user })
    }

    const [StudentData, courseData, assignmentData] = await Promise.all([
        Student.find({}),
        Course.find({}),
        Assignment.find({}),
    ])
    return res.status(200).json({ Data: { admin: user, StudentData, courseData, assignmentData } })
}

function handleLogout(req, res) {
    clearAuthCookie(res)
    return res.status(200).json({ msg: "Logged out successfully" })
}

function checkAuth(req, res) {
    return res.status(200).json({ valid: true, user: req.user })
}

// Fresh profile of whoever is logged in (students get course names filled in)
async function getMe(req, res) {
    const { role } = req.user
    if (role === "student") {
        await req.account.populate("courses.course", "courseName")
    }
    return res.status(200).json({ role, user: req.account })
}

async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body ?? {}
    if (typeof currentPassword !== "string" || !currentPassword) {
        throw new HttpError(400, "Enter your current password")
    }

    const Model = modelForRole(req.user.role)
    const account = await Model.findById(req.user.id)
    if (!await bcrypt.compare(currentPassword, account.password)) {
        throw new HttpError(400, "Current password is incorrect")
    }

    account.password = await hashPassword(newPassword)
    // 1s back-dated so the fresh token issued below (whole-second iat) is still accepted
    account.passwordChangedAt = new Date(Date.now() - 1000)
    await account.save()

    // other devices are now logged out; keep this one logged in
    setAuthCookie(res, generateToken(account, req.user.role))
    return res.status(200).json({ msg: "Password changed" })
}

// ADMIN SIGN-UP ------------------------------------------------------------------
// Open only while there are no admins yet (first-time setup). After that, only a
// logged-in admin can create another admin.
async function getSetupStatus(req, res) {
    const adminExists = await Admin.exists({})
    return res.status(200).json({ adminSignupOpen: !adminExists })
}

async function handleNewAdmin(req, res) {
    const adminExists = await Admin.exists({})
    if (adminExists) {
        const session = await findAccountForToken(req.cookies?.[COOKIE_NAME])
        if (session?.role !== "admin") {
            throw new HttpError(403, "Admin sign-up is closed. Ask an existing admin to create your account.")
        }
    }

    const body = pick(req.body, ADMIN_FIELDS)
    requireFields(body, ["firstName", "lastName", "gender", "email", "password"])
    body.email = normalizeEmail(body.email)
    body.password = await hashPassword(body.password)

    const admin = await Admin.create(body)
    return res.status(201).json(admin)
}

module.exports = {
    handleLogin,
    handleLogout,
    checkAuth,
    getMe,
    changePassword,
    getSetupStatus,
    handleNewAdmin,
}
