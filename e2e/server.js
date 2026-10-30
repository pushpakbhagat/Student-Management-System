// Starts what the browser tests need: a throwaway in-memory MongoDB filled with the demo data,
// and the API on port 8006. Playwright runs this (see playwright.config.js) and stops it afterwards.
// The API runs inside this process, so stopping it leaves nothing behind (mongod is stopped by
// mongodb-memory-server's own watchdog when this process ends).
const path = require("path")
const crypto = require("crypto")
const { spawnSync } = require("child_process")

const backend = path.join(__dirname, "..", "backend")
const fromBackend = (name) => require(require.resolve(name, { paths: [backend] }))
const { MongoMemoryServer } = fromBackend("mongodb-memory-server-core")

const API_PORT = 8006
const WEB_URL = "http://localhost:5180"

async function main() {
    const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
    Object.assign(process.env, {
        MONGO_URI: mongo.getUri("studenthub-e2e"),
        JWT_SECRET: crypto.randomBytes(32).toString("hex"),
        PORT: String(API_PORT),
        NODE_ENV: "development",
        CLIENT_URLS: WEB_URL,
        DEMO_MODE: "true",
    })

    const seeded = spawnSync(process.execPath, ["seed.js", "--yes"], { cwd: backend, env: process.env, stdio: "inherit" })
    if (seeded.status !== 0) throw new Error("Seeding the test database failed")

    // the same mongoose instance the backend's models use
    const mongoose = fromBackend("mongoose")
    const app = require(path.join(backend, "app"))
    await mongoose.connect(process.env.MONGO_URI)
    app.listen(API_PORT, () => console.log(`e2e API ready on http://localhost:${API_PORT}`))
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
