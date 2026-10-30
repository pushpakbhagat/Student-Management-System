// End-to-end API tests against a throwaway in-memory MongoDB.
// Run with: npm test   (the first run downloads a MongoDB binary, later runs are fast)
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-the-checks"
process.env.DEMO_MODE = "true"
process.env.DEMO_ADMIN_EMAIL = "ada@test.com"
process.env.DEMO_STUDENT_EMAIL = "demo@test.com"

const { test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const request = require("supertest")
const { MongoMemoryServer } = require("mongodb-memory-server-core")
const app = require("../app")

let mongo
let adminAgent      // keeps the admin login cookie between requests
let studentAgent
let courseId
let studentId

const admin = { firstName: "Ada", lastName: "Admin", gender: "Female", email: "ada@test.com", password: "admin123" }
const student = { firstName: "Sam", lastName: "Student", gender: "Male", email: "sam@test.com", password: "student123" }

before(async () => {
    // generous timeout: the first start on Windows can be slow while antivirus scans the binary
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } })
    await mongoose.connect(mongo.getUri())
    adminAgent = request.agent(app)
    studentAgent = request.agent(app)
})

after(async () => {
    await mongoose.disconnect()
    await mongo?.stop()
})

test("first admin can sign up, after that admin sign-up is closed", async () => {
    const res = await request(app).post("/admins").send(admin)
    assert.equal(res.status, 201)
    assert.equal(res.body.password, undefined)

    const second = await request(app).post("/admins").send({ ...admin, email: "eve@test.com" })
    assert.equal(second.status, 403)
})

test("login validates input and does not reveal which part was wrong", async () => {
    assert.equal((await request(app).post("/logininfo").send({ email: admin.email, password: "x" })).status, 400)
    assert.equal((await request(app).post("/logininfo").send({ email: admin.email, password: "nope", role: "admin" })).status, 401)
    assert.equal((await request(app).post("/logininfo").send({ email: "who@test.com", password: "nope", role: "admin" })).status, 401)
    assert.equal((await request(app).post("/logininfo").send({ email: { $gt: "" }, password: "x", role: "admin" })).status, 400)
})

test("admin login sets an httpOnly cookie and returns dashboard data without password hashes", async () => {
    const res = await adminAgent.post("/logininfo").send({ email: admin.email, password: admin.password, role: "admin" })
    assert.equal(res.status, 200)
    assert.match(res.headers["set-cookie"][0], /token=.*HttpOnly/i)
    assert.equal(res.body.Data.admin.password, undefined)
    assert.ok(Array.isArray(res.body.Data.StudentData))

    const check = await adminAgent.get("/check-auth")
    assert.equal(check.status, 200)
    assert.equal(check.body.user.role, "admin")
    assert.equal(check.body.user.password, undefined)
})

test("protected routes reject anonymous requests", async () => {
    assert.equal((await request(app).get("/students")).status, 401)
    assert.equal((await request(app).post("/courses").send({ courseName: "Hack" })).status, 401)
    assert.equal((await request(app).delete(`/students/${new mongoose.Types.ObjectId()}`)).status, 401)
    assert.equal((await request(app).get("/check-auth")).status, 401)
})

test("admin creates a course and a student, then enrolls the student", async () => {
    const course = await adminAgent.post("/courses").send({ courseName: "Physics" })
    assert.equal(course.status, 201)
    courseId = course.body.course._id

    assert.equal((await adminAgent.post("/courses").send({ courseName: "Physics" })).status, 409)

    const created = await adminAgent.post("/students").send(student)
    assert.equal(created.status, 201)
    assert.equal(created.body.password, undefined)
    studentId = created.body._id

    assert.equal((await adminAgent.post("/students").send(student)).status, 409)

    const enroll = await adminAgent.patch("/enrollmultiplecourses").send({ StudentId: studentId, AppliedCourses: [courseId, courseId, "bad-id"] })
    assert.equal(enroll.status, 200)
    assert.equal(enroll.body.Student.courses.length, 1)
    assert.equal(enroll.body.skipped.length, 2)

    const all = await adminAgent.get("/students")
    assert.equal(all.status, 200)
    assert.ok(all.body.every(s => s.password === undefined))
})

test("attendance and marks update, and 0 marks are allowed", async () => {
    const present = await adminAgent.patch("/courses/attendance").send({ CourseId: courseId, StudentId: studentId, ifPresent: true })
    assert.equal(present.status, 200)
    assert.equal(present.body.student.courses[0].attendedClasses, 1)
    assert.equal(present.body.student.courses[0].totalClasses, 1)

    const marks = await adminAgent.patch("/courses/marks").send({ CourseId: courseId, StudentId: studentId, Marks: "0" })
    assert.equal(marks.status, 200)
    assert.equal(marks.body.Student.courses[0].marks, 0)

    const negative = await adminAgent.patch("/courses/marks").send({ CourseId: courseId, StudentId: studentId, Marks: -5 })
    assert.equal(negative.status, 400)

    const notEnrolled = await adminAgent.patch("/courses/attendance").send({ CourseId: new mongoose.Types.ObjectId().toString(), StudentId: studentId, ifPresent: true })
    assert.equal(notEnrolled.status, 404)
})

test("student update only changes allowed fields", async () => {
    const res = await adminAgent.patch(`/students/${student.email}`).send({ lastName: "Updated", courses: [], marks: 100 })
    assert.equal(res.status, 200)
    assert.equal(res.body.lastName, "Updated")
    assert.equal(res.body.courses.length, 1)
})

test("students can log in but cannot use admin routes", async () => {
    const login = await studentAgent.post("/logininfo").send({ email: student.email, password: student.password, role: "student" })
    assert.equal(login.status, 200)
    assert.equal(login.body.student.password, undefined)

    assert.equal((await studentAgent.get("/students")).status, 403)
    assert.equal((await studentAgent.patch("/courses/marks").send({ CourseId: courseId, StudentId: studentId, Marks: 100 })).status, 403)
    assert.equal((await studentAgent.post("/admins").send({ ...admin, email: "sneaky@test.com" })).status, 403)

    assert.equal((await studentAgent.get(`/students/email/${student.email}`)).status, 200)
    assert.equal((await studentAgent.get(`/students/email/${admin.email}`)).status, 403)

    const me = await studentAgent.get("/me")
    assert.equal(me.status, 200)
    assert.equal(me.body.user.courses[0].course.courseName, "Physics")
})

test("assignments: create, list, delete by id", async () => {
    const created = await adminAgent.post("/assignments").send({ CourseId: courseId, title: "HW1", description: "Read ch.1", dueDate: "2030-01-01" })
    assert.equal(created.status, 201)
    const id = created.body.assignment._id

    const list = await studentAgent.get("/assignments")
    assert.equal(list.status, 200)
    assert.equal(list.body.assignments[0].course.courseName, "Physics")

    assert.equal((await adminAgent.delete(`/assignments/${id}`)).status, 200)
    assert.equal((await adminAgent.delete(`/assignments/${id}`)).status, 404)
})

test("deleting a student removes them from course rosters; deleting a course un-enrolls students", async () => {
    const other = await adminAgent.post("/students").send({ ...student, email: "temp@test.com" })
    await adminAgent.post("/enrollcourse").send({ StudentId: other.body._id, CourseId: courseId })

    const del = await adminAgent.delete(`/students/${other.body._id}`)
    assert.equal(del.status, 200)
    assert.equal(del.body.student.email, "temp@test.com")
    assert.equal((await adminAgent.delete("/students/not-an-id")).status, 400)

    const courseDel = await adminAgent.delete(`/courses/${courseId}`)
    assert.equal(courseDel.status, 200)
    const remaining = await adminAgent.get(`/students/email/${student.email}`)
    assert.equal(remaining.body.courses.length, 0)
})

test("setup status reports that admin sign-up is closed", async () => {
    const res = await request(app).get("/setup-status")
    assert.equal(res.status, 200)
    assert.equal(res.body.adminSignupOpen, false)
})

test("CSRF: state-changing requests from other origins and form posts are refused", async () => {
    const evil = await adminAgent.post("/courses").set("Origin", "https://evil.example").send({ courseName: "Evil" })
    assert.equal(evil.status, 403)

    const ours = await adminAgent.post("/courses").set("Origin", "http://localhost:5173").send({ courseName: "Chemistry" })
    assert.equal(ours.status, 201)

    // HTML forms can only send url-encoded bodies, which the API no longer reads
    const form = await adminAgent.post("/courses").type("form").send({ courseName: "Biology" })
    assert.equal(form.status, 400)
})

test("a deleted admin's token stops working immediately", async () => {
    const created = await adminAgent.post("/admins").send({ ...admin, email: "temp-admin@test.com" })
    assert.equal(created.status, 201)

    const tempAgent = request.agent(app)
    await tempAgent.post("/logininfo").send({ email: "temp-admin@test.com", password: admin.password, role: "admin" })
    assert.equal((await tempAgent.get("/students")).status, 200)

    await mongoose.model("Admin").deleteOne({ email: "temp-admin@test.com" })
    assert.equal((await tempAgent.get("/students")).status, 401)
})

test("login ignores email case", async () => {
    const res = await request(app).post("/logininfo").send({ email: "SAM@Test.com", password: student.password, role: "student" })
    assert.equal(res.status, 200)
})

test("students only see their own courses and assignments", async () => {
    const mine = (await adminAgent.post("/courses").send({ courseName: "History" })).body.course
    const other = (await adminAgent.post("/courses").send({ courseName: "Art" })).body.course
    await adminAgent.post("/enrollcourse").send({ StudentId: studentId, CourseId: mine._id })
    await adminAgent.post("/assignments").send({ CourseId: mine._id, title: "Essay", dueDate: "2030-01-01" })
    await adminAgent.post("/assignments").send({ CourseId: other._id, title: "Painting", dueDate: "2030-01-01" })

    const agent = request.agent(app)
    await agent.post("/logininfo").send({ email: student.email, password: student.password, role: "student" })

    const courses = await agent.get("/courses")
    assert.deepEqual(courses.body.Courses.map(c => c.courseName), ["History"])
    assert.equal(courses.body.Courses[0].students, undefined)

    const assignments = await agent.get("/assignments")
    assert.deepEqual(assignments.body.assignments.map(a => a.title), ["Essay"])
    assert.equal((await agent.get(`/assignments/course/${other._id}`)).status, 403)

    const unenroll = await adminAgent.delete(`/courses/${mine._id}/students/${studentId}`)
    assert.equal(unenroll.status, 200)
    assert.equal((await agent.get("/assignments")).body.assignments.length, 0)
})

test("changing a password logs out other sessions but keeps this one", async () => {
    const phone = request.agent(app)
    const laptop = request.agent(app)
    await phone.post("/logininfo").send({ email: student.email, password: student.password, role: "student" })
    await laptop.post("/logininfo").send({ email: student.email, password: student.password, role: "student" })

    assert.equal((await phone.patch("/me/password").send({ currentPassword: "wrong-one", newPassword: "newpass123" })).status, 400)
    assert.equal((await phone.patch("/me/password").send({ currentPassword: student.password, newPassword: "short" })).status, 400)

    const changed = await phone.patch("/me/password").send({ currentPassword: student.password, newPassword: "newpass123" })
    assert.equal(changed.status, 200)
    assert.equal((await phone.get("/me")).status, 200)
    assert.equal((await laptop.get("/me")).status, 401)

    const relogin = await request(app).post("/logininfo").send({ email: student.email, password: "newpass123", role: "student" })
    assert.equal(relogin.status, 200)
})

test("demo mode: one-click login, and the demo accounts are protected", async () => {
    assert.equal((await request(app).get("/setup-status")).body.demo, true)

    const demoAdmin = request.agent(app)
    assert.equal((await demoAdmin.post("/demo-login").send({ role: "admin" })).status, 200)
    assert.equal((await demoAdmin.patch("/me/password").send({ currentPassword: admin.password, newPassword: "hijacked123" })).status, 403)

    assert.equal((await request(app).post("/demo-login").send({ role: "student" })).status, 404)
    const created = await adminAgent.post("/students").send({ ...student, email: "demo@test.com" })
    assert.equal((await request(app).post("/demo-login").send({ role: "student" })).status, 200)
    assert.equal((await adminAgent.delete(`/students/${created.body._id}`)).status, 403)
    assert.equal((await adminAgent.patch("/students/demo@test.com").send({ password: "hijacked123" })).status, 403)
    assert.equal((await adminAgent.patch("/students/demo@test.com").send({ lastName: "Renamed" })).status, 200)
})

test("profile photos: uploaded images and web addresses are accepted, scripts are not", async () => {
    const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    const ok = await adminAgent.patch("/me/photo").send({ imgURL: tinyPng })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.user.imgURL, tinyPng)
    assert.equal((await adminAgent.patch("/me/photo").send({ imgURL: "https://example.com/me.jpg" })).status, 200)
    assert.equal((await adminAgent.patch("/me/photo").send({ imgURL: "javascript:alert(1)" })).status, 400)
    assert.equal((await adminAgent.patch("/me/photo").send({ imgURL: "" })).status, 200)
})

test("logout clears the cookie and unknown routes return 404 JSON", async () => {
    const res = await studentAgent.post("/logout")
    assert.equal(res.status, 200)
    assert.equal((await studentAgent.get("/check-auth")).status, 401)

    const missing = await request(app).get("/nope")
    assert.equal(missing.status, 404)
    assert.match(missing.body.msg, /Route not found/)
})
