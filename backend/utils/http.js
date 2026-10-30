// Throw one of these from a controller and the error handler turns it into a JSON response
class HttpError extends Error {
    constructor(status, msg) {
        super(msg)
        this.status = status
    }
}

const OBJECT_ID = /^[a-f\d]{24}$/i

function isValidId(id) {
    return OBJECT_ID.test(String(id))
}

function assertValidId(id, label = "id") {
    if (!isValidId(id)) throw new HttpError(400, `Invalid ${label}`)
}

// Copy only the allowed keys from the request body, so clients can't set fields like courses or marks
function pick(source, keys) {
    const result = {}
    for (const key of keys) {
        if (source?.[key] !== undefined) result[key] = source[key]
    }
    return result
}

function requireFields(body, keys) {
    const missing = keys.filter(key => body[key] === undefined || body[key] === null || body[key] === "")
    if (missing.length) throw new HttpError(400, `Missing required fields: ${missing.join(", ")}`)
}

module.exports = {
    HttpError,
    isValidId,
    assertValidId,
    pick,
    requireFields,
}
