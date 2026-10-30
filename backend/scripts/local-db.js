// Runs a real MongoDB on this computer for development - no install or Atlas account needed.
// Data is saved in backend/.local-db, so it survives restarts. Stop it with Ctrl+C.
const path = require("path")
const fs = require("fs")
const net = require("net")
const { MongoMemoryServer } = require("mongodb-memory-server-core")

const PORT = 27017
const DB_PATH = path.join(__dirname, "..", ".local-db")

function portInUse(port) {
    return new Promise(resolve => {
        const socket = net.connect(port, "127.0.0.1")
        socket.once("connect", () => { socket.destroy(); resolve(true) })
        socket.once("error", () => resolve(false))
    })
}

async function main() {
    // e.g. left running after a terminal was closed - just use it
    if (await portInUse(PORT)) {
        console.log(`A database is already running on port ${PORT} - using it.`)
        return
    }

    fs.mkdirSync(DB_PATH, { recursive: true })

    const server = await MongoMemoryServer.create({
        instance: {
            port: PORT,
            dbPath: DB_PATH,
            storageEngine: "wiredTiger",   // writes to disk (the default keeps data in memory only)
            launchTimeout: 60000,
        },
    })

    console.log(`Local MongoDB running at mongodb://127.0.0.1:${PORT}/studenthub`)
    console.log(`Data folder: ${DB_PATH}`)

    const stop = async () => {
        await server.stop({ doCleanup: false })   // keep the data folder
        process.exit(0)
    }
    process.on("SIGINT", stop)
    process.on("SIGTERM", stop)
}

main().catch(err => {
    console.error("Could not start the local database:", err.message)
    if (err.message.includes("already in use")) {
        console.error(`Port ${PORT} is busy - is another MongoDB (or another copy of this script) already running?`)
    }
    process.exit(1)
})
