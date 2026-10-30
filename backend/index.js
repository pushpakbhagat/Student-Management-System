const mongoose = require("mongoose")
const env = require("./config/env")
const app = require("./app")

async function start() {
    env.assertRequiredEnv()

    // Connect first, so the API never accepts requests it can't serve
    await mongoose.connect(env.mongoUri)
    console.log("MongoDB connected")

    const server = app.listen(env.port, () => {
        console.log(`Student Management System API running on port ${env.port} (${env.nodeEnv})`)
    })

    // Hosts send SIGTERM before restarting/redeploying: finish open requests, then exit
    const shutdown = (signal) => {
        console.log(`${signal} received, shutting down`)
        server.close(async () => {
            await mongoose.disconnect()
            process.exit(0)
        })
        setTimeout(() => process.exit(1), 10000).unref()
    }
    process.on("SIGTERM", shutdown)
    process.on("SIGINT", shutdown)
}

start().catch(err => {
    console.error("Failed to start server:", err.message)
    process.exit(1)
})
