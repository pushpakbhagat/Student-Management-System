const bcrypt = require("bcrypt")
const env = require("../config/env")
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
    accountHasRole,
    normalizeEmail,
    findByEmail,
    isDemoAccount,
    COOKIE_NAME,
} = require("../services/auth")
const { courseScope } = require("../services/scope")
const { HttpError, pick, requireFields } = require("../utils/http")

const STAFF_FIELDS = ["firstName", "lastName", "gender", "email", "password", "imgURL"]

// Sets the cookie and sends what each role's app needs to start.
// Teachers get the same shape as admins, limited to their own courses.
async function startSession(res, user, role) {
    setAuthCookie(res, generateToken(user, role))

    if (role === "student") {
        return res.status(200).json({ student: user })
    }

    const scope = await courseScope({ id: user._id, role })
    const [StudentData, courseData, assignmentData] = await Promise.all([
        Student.find(scope ? { "courses.course": scope } : {}).sort({ createdAt: -1 }),
        Course.find(scope ? { _id: scope } : {}).sort({ courseName: 1 }),
        Assignment.find(scope ? { course: scope } : {}),
    ])
    return res.status(200).json({ Data: { admin: user, StudentData, courseData, assignmentData } })
}

// LOGIN --------------------------------------------------------------------------
async function handleLogin(req, res) {
    const { email, password, role } = req.body ?? {}

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
        throw new HttpError(400, "Email and password are required")
    }
    const Model = modelForRole(role)
    if (!Model) {
        throw new HttpError(400, "Choose whether you are signing in as a student, teacher or admin")
    }

    const user = await findByEmail(Model, email)
    const isMatch = user && accountHasRole(user, role) && await bcrypt.compare(password, user.password)
    // same message for "no user" and "wrong password" so nobody can probe which emails exist
    if (!isMatch) {
        throw new HttpError(401, "Wrong email or password")
    }

    return startSession(res, user, role)
}

// One-click login into the demo accounts, only when DEMO_MODE=true
async function handleDemoLogin(req, res) {
    if (!env.demoMode) throw new HttpError(404, "Demo mode is off")
    const role = req.body?.role
    const Model = modelForRole(role)
    if (!Model) throw new HttpError(400, "Choose the admin, teacher or student demo")

    const user = await findByEmail(Model, env.demoAccounts[role])
    if (!user || !accountHasRole(user, role)) throw new HttpError(404, "The demo account doesn't exist yet. Run the seed script.")
    return startSession(res, user, role)
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
    if (isDemoAccount(req.account)) {
        throw new HttpError(403, "The demo account's password can't be changed")
    }
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
    account.passwordChangedAt = new Date()
    await account.save()

    // other devices are now logged out; keep this one logged in
    setAuthCookie(res, generateToken(account, req.user.role))
    return res.status(200).json({ msg: "Password changed" })
}

// Anyone can change (or remove) their own profile photo
async function updateMyPhoto(req, res) {
    const imgURL = typeof req.body?.imgURL === "string" ? req.body.imgURL.trim() : ""
    req.account.imgURL = imgURL
    await req.account.save()
    return res.status(200).json({ user: req.account })
}

// STAFF ACCOUNTS -----------------------------------------------------------------
// Public sign-up is open only while there are no admins yet (first-time setup) and always
// creates an admin. After that, only a logged-in admin can add admins or teachers.
const ANY_ADMIN = { role: { $ne: "teacher" } }

async function getSetupStatus(req, res) {
    const adminExists = await Admin.exists(ANY_ADMIN)
    return res.status(200).json({ adminSignupOpen: !adminExists, demo: env.demoMode })
}

async function handleNewAdmin(req, res) {
    const adminExists = await Admin.exists(ANY_ADMIN)
    let role = "admin"
    if (adminExists) {
        const session = await findAccountForToken(req.cookies?.[COOKIE_NAME])
        if (session?.role !== "admin") {
            throw new HttpError(403, "Admin sign-up is closed. Ask an existing admin to create your account.")
        }
        if (req.body?.role === "teacher") role = "teacher"
    }

    const body = pick(req.body, STAFF_FIELDS)
    requireFields(body, ["firstName", "lastName", "gender", "email", "password"])
    body.email = normalizeEmail(body.email)
    body.password = await hashPassword(body.password)

    const staff = await Admin.create({ ...body, role })
    return res.status(201).json(staff)
}

// Everyone on staff, with the courses each teacher has (admins only)
async function listStaff(req, res) {
    const [staff, courses] = await Promise.all([
        Admin.find({}).sort({ role: 1, firstName: 1 }),
        Course.find({ "teachers.0": { $exists: true } }, "courseName teachers"),
    ])
    const result = staff.map(s => ({
        ...s.toJSON(),
        role: s.role ?? "admin",
        courses: courses.filter(c => c.teachers.some(t => String(t) === String(s._id))).map(c => ({ _id: c._id, courseName: c.courseName })),
    }))
    return res.status(200).json({ staff: result })
}

module.exports = {
    listStaff,
    handleLogin,
    handleDemoLogin,
    handleLogout,
    checkAuth,
    getMe,
    changePassword,
    updateMyPhoto,
    getSetupStatus,
    handleNewAdmin,
}
