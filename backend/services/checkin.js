const crypto = require("crypto")
const env = require("../config/env")

// QR check-in codes: "<sessionId>.<window>.<signature>". A new code every 20 seconds,
// signed with the server secret, so a screenshot shared later (or a guessed code) won't work.
const WINDOW_MS = 20000

function currentWindow(now = Date.now()) {
    return Math.floor(now / WINDOW_MS)
}

function sign(sessionId, window) {
    return crypto.createHmac("sha256", `${env.jwtSecret}:checkin`)
        .update(`${sessionId}:${window}`)
        .digest("base64url")
        .slice(0, 16)
}

function makeToken(sessionId, now = Date.now()) {
    const window = currentWindow(now)
    return {
        token: `${sessionId}.${window}.${sign(String(sessionId), window)}`,
        expiresInMs: (window + 1) * WINDOW_MS - now,
    }
}

// Returns the session id if the code is genuine and from the current or previous window
function readToken(token, now = Date.now()) {
    if (typeof token !== "string") return null
    const [sessionId, windowText, signature] = token.split(".")
    const window = Number(windowText)
    if (!sessionId || !Number.isInteger(window) || !signature) return null
    const current = currentWindow(now)
    if (window !== current && window !== current - 1) return null

    const expected = Buffer.from(sign(sessionId, window))
    const given = Buffer.from(signature)
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null
    return sessionId
}

module.exports = { makeToken, readToken, WINDOW_MS }
