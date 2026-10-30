function notFound(req, res) {
    res.status(404).json({ msg: `Route not found: ${req.method} ${req.originalUrl}` })
}

// Express 5 forwards errors thrown in async controllers here, so controllers don't need try/catch
function errorHandler(err, req, res, next) {
    // HttpError from our controllers, or body-parser errors like invalid JSON
    if (err.status && err.status < 500) {
        return res.status(err.status).json({ msg: err.message })
    }
    if (err.name === "CastError") {
        return res.status(400).json({ msg: `Invalid ${err.path}` })
    }
    if (err.name === "ValidationError") {
        const msg = Object.values(err.errors).map(e => e.message).join(", ")
        return res.status(400).json({ msg })
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "value"
        return res.status(409).json({ msg: `That ${field} is already taken` })
    }

    console.error(err)
    return res.status(500).json({ msg: "Something went wrong on the server" })
}

module.exports = {
    notFound,
    errorHandler,
}
