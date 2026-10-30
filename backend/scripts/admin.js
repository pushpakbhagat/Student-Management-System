// Manage admin accounts directly in the database (uses MONGO_URI from backend/.env).
// Safe for a live database: it never deletes anything.
//
//   npm run admin -- list
//   npm run admin -- create          (asks for name, email and password)
//   npm run admin -- reset-password  (asks for email and new password)
//
// Answers can also be passed as flags, e.g. --email a@b.com --password secret123
const readline = require("readline")
const mongoose = require("mongoose")
const env = require("../config/env")
const Admin = require("../models/admin")
const { hashPassword, findByEmail, normalizeEmail } = require("../services/auth")

const [command, ...rest] = process.argv.slice(2)
const flags = {}
for (let i = 0; i < rest.length; i += 2) flags[rest[i].replace(/^--/, "")] = rest[i + 1]

function ask(question, { hidden = false } = {}) {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
        if (hidden) {
            // don't echo the password to the screen
            rl._writeToOutput = (text) => { if (text.includes(question)) rl.output.write(text) }
        }
        rl.question(question, answer => {
            rl.close()
            if (hidden) process.stdout.write("\n")
            resolve(answer.trim())
        })
    })
}

async function value(name, question, options) {
    return flags[name] ?? ask(question, options)
}

async function list() {
    const admins = await Admin.find({}, "firstName lastName email createdAt").sort({ createdAt: 1 })
    if (!admins.length) return console.log("No admins yet. Create one with: npm run admin -- create")
    console.log(`${admins.length} admin(s):`)
    for (const a of admins) console.log(`  • ${a.firstName} ${a.lastName ?? ""} <${a.email}>`)
}

async function create() {
    const firstName = await value("first", "First name: ")
    const lastName = await value("last", "Last name: ")
    const email = normalizeEmail(await value("email", "Email: "))
    const password = await value("password", "Password (8+ characters): ", { hidden: true })
    const admin = await Admin.create({
        firstName, lastName, email, gender: flags.gender ?? "Other",
        password: await hashPassword(password),
    })
    console.log(`✅ Admin created: ${admin.email}`)
}

async function resetPassword() {
    const email = await value("email", "Admin email: ")
    const admin = await findByEmail(Admin, email)
    if (!admin) throw new Error(`No admin with email ${email}. Run "npm run admin -- list" to see them.`)
    const password = await value("password", "New password (8+ characters): ", { hidden: true })
    admin.password = await hashPassword(password)
    admin.passwordChangedAt = new Date()   // signs out any old sessions
    await admin.save()
    console.log(`✅ Password reset for ${admin.email}`)
}

const COMMANDS = { list, create, "reset-password": resetPassword }

async function main() {
    if (!COMMANDS[command]) {
        console.log("Usage: npm run admin -- <list | create | reset-password>")
        process.exit(command ? 1 : 0)
    }
    if (!env.mongoUri) throw new Error("MONGO_URI is not set in backend/.env")

    const host = env.mongoUri.replace(/\/\/[^@]*@/, "//").split("?")[0]
    console.log(`Database: ${host}\n`)
    await mongoose.connect(env.mongoUri)
    try {
        await COMMANDS[command]()
    } finally {
        await mongoose.disconnect()
    }
}

main().catch(err => {
    console.error("❌", err.message)
    process.exit(1)
})
