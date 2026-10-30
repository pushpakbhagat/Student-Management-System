const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const env = require("../config/env")
const Student = require("../models/student")
const Admin = require("../models/admin")
const { HttpError } = require("../utils/http")

const COOKIE_NAME = "token"
const SALT_ROUNDS = 10
const MIN_PASSWORD_LENGTH = 8
const MODEL_FOR_ROLE = { student: Student, admin: Admin }

// Emails are stored lowercase; this collation also matches older mixed-case records
const CASE_INSENSITIVE = { locale: "en", strength: 2 }

function modelForRole(role) {
    return Object.hasOwn(MODEL_FOR_ROLE, role) ? MODEL_FOR_ROLE[role] : null
}

function normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : ""
}

function findByEmail(Model, email) {
    return Model.findOne({ email: normalizeEmail(email) }).collation(CASE_INSENSITIVE)
}

// Only identify the user in the token - never put the password (or its hash) in here
function generateToken(user, role) {
    const payload = {
        id: user._id.toString(),
        email: user.email,
        role: role,
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
    if (!account) return null
    if (account.passwordChangedAt && payload.iat * 1000 < account.passwordChangedAt.getTime()) return null

    return { account, role: payload.role }
}

// In production the frontend (Netlify) and the API live on different sites,
// so the browser only sends the cookie if it is SameSite=None + Secure.
function cookieOptions() {
    return {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.isProduction ? "none" : "lax",
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
    normalizeEmail,
    findByEmail,
    generateToken,
    verifyToken,
    findAccountForToken,
    setAuthCookie,
    clearAuthCookie,
    hashPassword,
}
