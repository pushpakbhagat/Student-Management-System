// Prints one line per request, e.g. "POST /logininfo 200 84ms"
function requestLogger(req, res, next) {
    const start = Date.now()
    res.on("finish", () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`)
    })
    next()
}

module.exports = {
    requestLogger,
}
