const { findAccountForToken, clearAuthCookie, COOKIE_NAME } = require("../services/auth")

async function requireAuth(req, res, next) {
    const session = await findAccountForToken(req.cookies?.[COOKIE_NAME])
    if (!session) {
        clearAuthCookie(res)
        return res.status(401).json({ msg: "Not authenticated" })
    }
    const { account, role } = session
    req.user = { id: account._id.toString(), email: account.email, role }   // who is calling
    req.account = account                                                   // their fresh database record
    next()
}

// Usage: router.get("/path", requireRole("admin"), handler)
function requireRole(...roles) {
    return [
        requireAuth,
        (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ msg: "You are not allowed to do this" })
            }
            next()
        },
    ]
}

const requireAdmin = requireRole("admin")

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin,
}
