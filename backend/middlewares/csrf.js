const env = require("../config/env")

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// The login cookie is SameSite=None in production, so a malicious site could make a
// logged-in browser send it with a forged form POST. Browsers always send an Origin
// header on cross-site requests, so refuse any state-changing request from an origin
// that isn't our frontend. (Requests without Origin - curl, server-to-server - carry no
// browser cookie, so they can't ride on someone's session.)
function rejectCrossSiteRequests(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next()

    const origin = req.get("origin")
    // the API's own pages (the /docs explorer) count as trusted too
    const ownOrigin = `${req.protocol}://${req.get("host")}`
    if (origin && origin !== ownOrigin && !env.clientUrls.includes(origin)) {
        return res.status(403).json({ msg: "Request blocked: it did not come from the StudentHub app" })
    }
    next()
}

module.exports = {
    rejectCrossSiteRequests,
}
