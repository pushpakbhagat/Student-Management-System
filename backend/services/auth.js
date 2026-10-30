const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const env = require("../config/env")
const Student = require("../models/student")
const Admin = require("../models/admin")
const { HttpError } = require("../utils/http")

const COOKIE_NAME = "token"
const SALT_ROUNDS = 10
const MIN_PASSWORD_LENGTH = 8
// admins and teachers are both staff accounts (Admin model, told apart by `role`)
const MODEL_FOR_ROLE = { student: Student, admin: Admin, teacher: Admin }

// Emails are stored lowercase; this collation also matches older mixed-case records
const CASE_INSENSITIVE = { locale: "en", strength: 2 }

function modelForRole(role) {
    return Object.hasOwn(MODEL_FOR_ROLE, role) ? MODEL_FOR_ROLE[role] : null
}

// e.g. a teacher can't sign in through the "admin" door, and vice versa
function accountHasRole(account, role) {
    if (role === "student") return account instanceof Student
    return account instanceof Admin && (account.role ?? "admin") === role
}

function normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : ""
}

function findByEmail(Model, email) {
    return Model.findOne({ email: normalizeEmail(email) }).collation(CASE_INSENSITIVE)
}

// In demo mode the shared demo logins are protected, so visitors can't lock each other out
function isDemoAccount(account) {
    if (!env.demoMode || !account?.email) return false
    const email = normalizeEmail(account.email)
    return Object.values(env.demoAccounts).some(demo => normalizeEmail(demo) === email)
}

// Only identify the user in the token - never put the password (or its hash) in here
function generateToken(user, role) {
    const payload = {
        id: user._id.toString(),
        email: user.email,
        role: role,
        // millisecond issue time; the standard `iat` is whole seconds, too coarse to compare
        // with a password change that happens right after a login
        issuedAt: Date.now(),
    }
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

function verifyToken(token) {
    if (!token) return null
    try {
        return jwt.verify(token, env.jwtSecret)
    } catch (err) {
        return null
    }
}

// A valid signature isn't enough: the account must still exist, and the token must
// be newer than the last password change (so changing a password logs out old sessions).
async function findAccountForToken(token) {
    const payload = verifyToken(token)
    const Model = payload && modelForRole(payload.role)
    if (!Model) return null

    const account = await Model.findById(payload.id)
    if (!account || !accountHasRole(account, payload.role)) return null
    const issuedAt = payload.issuedAt ?? payload.iat * 1000
    if (account.passwordChangedAt && issuedAt < account.passwordChangedAt.getTime()) return null

    return { account, role: payload.role }
}

// When the frontend (Netlify) and the API live on different sites, the browser only
// sends the cookie if it is SameSite=None + Secure (see CROSS_SITE_COOKIES in config/env.js).
function cookieOptions() {
    return {
        httpOnly: true,
        secure: env.crossSiteCookies,
        sameSite: env.crossSiteCookies ? "none" : "lax",
        path: "/",
    }
}

function setAuthCookie(res, token) {
    const { exp } = jwt.decode(token)
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), expires: new Date(exp * 1000) })
}

function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, cookieOptions())
}

async function hashPassword(password) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    }
    if (password.length > 72) {
        // bcrypt ignores everything after 72 bytes
        throw new HttpError(400, "Password must be at most 72 characters")
    }
    return bcrypt.hash(password, SALT_ROUNDS)
}

module.exports = {
    COOKIE_NAME,
    CASE_INSENSITIVE,
    modelForRole,
    accountHasRole,
    normalizeEmail,
    findByEmail,
    isDemoAccount,
    generateToken,
    verifyToken,
    findAccountForToken,
    setAuthCookie,
    clearAuthCookie,
    hashPassword,
}
