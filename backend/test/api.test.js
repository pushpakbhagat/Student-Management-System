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

test("dated attendance sessions keep each student's totals in sync", async () => {
    const totals = (res) => {
        const s = res.body.students.find(x => x._id === studentId)
        return [s.courses[0].attendedClasses, s.courses[0].totalClasses]
    }
    const url = `/courses/${courseId}/sessions`

    const created = await adminAgent.post(url).send({ date: "2030-01-10", topic: "Intro", records: [{ student: studentId, status: "present" }] })
    assert.equal(created.status, 201)
    assert.deepEqual(totals(created), [1, 1])

    assert.equal((await adminAgent.post(url).send({ date: "2030-01-10", records: [{ student: studentId, status: "present" }] })).status, 409)
    assert.equal((await adminAgent.post(url).send({ date: "not-a-date", records: [{ student: studentId, status: "present" }] })).status, 400)
    assert.equal((await adminAgent.post(url).send({ date: "2030-01-11", records: [{ student: studentId, status: "asleep" }] })).status, 400)
    assert.equal((await adminAgent.post(url).send({ date: "2030-01-11", records: [{ student: new mongoose.Types.ObjectId(), status: "present" }] })).status, 400)

    const id = created.body.session._id
    assert.deepEqual(totals(await adminAgent.patch(`/sessions/${id}`).send({ records: [{ student: studentId, status: "absent" }] })), [0, 1])
    assert.deepEqual(totals(await adminAgent.patch(`/sessions/${id}`).send({ records: [{ student: studentId, status: "excused" }] })), [0, 0])
    assert.deepEqual(totals(await adminAgent.patch(`/sessions/${id}`).send({ records: [{ student: studentId, status: "late" }] })), [1, 1])

    const second = await adminAgent.post(url).send({ date: "2030-01-12", records: [{ student: studentId, status: "absent" }] })
    assert.deepEqual(totals(second), [1, 2])
    assert.deepEqual(totals(await adminAgent.delete(`/sessions/${second.body.session._id}`)), [1, 1])

    const list = await adminAgent.get(url)
    assert.equal(list.body.sessions.length, 1)
})

test("grades: weighted assessments, score limits, and 0 is a valid score", async () => {
    const url = `/courses/${courseId}/assessments`
    const quiz = (await adminAgent.post(url).send({ title: "Quiz 1", kind: "quiz", maxScore: 20, weight: 40 })).body.assessment
    const final = (await adminAgent.post(url).send({ title: "Final", kind: "final", maxScore: 100, weight: 60 })).body.assessment
    assert.ok(quiz && final)
    assert.equal((await adminAgent.post(url).send({ title: "Bad", maxScore: 0, weight: 10 })).status, 400)

    assert.equal((await adminAgent.put(`/assessments/${quiz._id}/scores`).send({ scores: [{ student: studentId, score: 25 }] })).status, 400)
    assert.equal((await adminAgent.put(`/assessments/${quiz._id}/scores`).send({ scores: [{ student: studentId, score: 0 }] })).status, 200)
    const saved = await adminAgent.put(`/assessments/${quiz._id}/scores`).send({ scores: [{ student: studentId, score: 15 }] })
    assert.equal(saved.body.assessment.scores[0].score, 15)

    // lowering the max below an existing score is refused
    assert.equal((await adminAgent.patch(`/assessments/${quiz._id}`).send({ maxScore: 10 })).status, 400)
    assert.equal((await adminAgent.get(url)).body.assessments.length, 2)
})

test("announcements: everyone or one course, pinned first", async () => {
    const all = await adminAgent.post("/announcements").send({ title: "Welcome back!", body: "Term starts Monday" })
    assert.equal(all.status, 201)
    const course = await adminAgent.post("/announcements").send({ title: "Physics lab moved", course: courseId, pinned: true })
    assert.equal(course.body.announcement.course.courseName, "Physics")
    assert.equal((await adminAgent.post("/announcements").send({ body: "no title" })).status, 400)

    const list = await adminAgent.get("/announcements")
    assert.equal(list.body.announcements[0].title, "Physics lab moved")
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
    assert.equal((await studentAgent.post(`/courses/${courseId}/sessions`).send({ date: "2030-02-01", records: [{ student: studentId, status: "present" }] })).status, 403)
    assert.equal((await studentAgent.post(`/courses/${courseId}/assessments`).send({ title: "Easy A", maxScore: 1, weight: 100 })).status, 403)
    assert.equal((await studentAgent.post("/announcements").send({ title: "Free pizza" })).status, 403)

    // their own history, grades and announcements
    const history = await studentAgent.get("/me/attendance")
    assert.equal(history.body.history[0].status, "late")
    const grades = await studentAgent.get("/me/grades")
    assert.equal(grades.body.courses[0].grade.percent, 75)   // only the quiz is graded: 15/20
    assert.equal(grades.body.courses[0].grade.letter, "C")
    assert.equal(grades.body.gpa, 2)
    assert.equal((await studentAgent.get("/announcements")).body.announcements.length, 2)
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

test("teachers only manage the courses assigned to them", async () => {
    const a = (await adminAgent.post("/courses").send({ courseName: "Teach A" })).body.course
    const b = (await adminAgent.post("/courses").send({ courseName: "Teach B" })).body.course
    await adminAgent.post("/enrollcourse").send({ StudentId: studentId, CourseId: a._id })

    const t = await adminAgent.post("/admins").send({ firstName: "Tina", lastName: "Teach", gender: "Female", email: "tina@test.com", password: "teacher123", role: "teacher" })
    assert.equal(t.status, 201)
    assert.equal(t.body.role, "teacher")
    assert.equal((await adminAgent.put(`/courses/${a._id}/teachers`).send({ teacherIds: [t.body._id] })).status, 200)
    const adminId = (await adminAgent.get("/me")).body.user._id
    assert.equal((await adminAgent.put(`/courses/${b._id}/teachers`).send({ teacherIds: [adminId] })).status, 400)

    // a teacher can't come in through the admin door
    assert.equal((await request(app).post("/logininfo").send({ email: "tina@test.com", password: "teacher123", role: "admin" })).status, 401)

    const teacher = request.agent(app)
    const login = await teacher.post("/logininfo").send({ email: "tina@test.com", password: "teacher123", role: "teacher" })
    assert.equal(login.status, 200)
    assert.deepEqual(login.body.Data.courseData.map(c => c.courseName), ["Teach A"])
    assert.ok(login.body.Data.StudentData.length > 0)
    assert.ok(login.body.Data.StudentData.every(s => s.courses.some(e => e.course === a._id)))
    assert.deepEqual((await teacher.get("/courses")).body.Courses.map(c => c.courseName), ["Teach A"])

    const records = [{ student: studentId, status: "present" }]
    assert.equal((await teacher.post(`/courses/${a._id}/sessions`).send({ date: "2030-03-01", records })).status, 201)
    assert.equal((await teacher.post(`/courses/${b._id}/sessions`).send({ date: "2030-03-01", records })).status, 403)
    assert.equal((await teacher.post(`/courses/${b._id}/assessments`).send({ title: "x", maxScore: 10, weight: 10 })).status, 403)
    assert.equal((await teacher.post("/announcements").send({ title: "To everyone" })).status, 403)
    assert.equal((await teacher.post("/announcements").send({ title: "To my class", course: a._id })).status, 201)
    assert.equal((await teacher.post("/assignments").send({ CourseId: b._id, title: "Nope", dueDate: "2030-01-01" })).status, 403)
    assert.equal((await teacher.post("/students").send({ ...student, email: "x@test.com" })).status, 403)
    assert.equal((await teacher.post("/courses").send({ courseName: "Mine" })).status, 403)
    assert.equal((await teacher.post("/admins").send({ ...admin, email: "y@test.com" })).status, 403)
    assert.equal((await teacher.get("/staff")).status, 403)
    assert.equal((await teacher.get(`/students/${studentId}/report`)).status, 200)

    const staff = await adminAgent.get("/staff")
    assert.equal(staff.body.staff.find(s => s.email === "tina@test.com").courses.length, 1)
})

test("insights: at-risk students, chart data, report cards and notifications", async () => {
    const course = (await adminAgent.post("/courses").send({ courseName: "Risk 101" })).body.course
    const weak = (await adminAgent.post("/students").send({ ...student, firstName: "Wes", email: "wes@test.com" })).body
    await adminAgent.post("/enrollcourse").send({ StudentId: weak._id, CourseId: course._id })
    for (const date of ["2030-04-01", "2030-04-02", "2030-04-03"]) {
        await adminAgent.post(`/courses/${course._id}/sessions`).send({ date, records: [{ student: weak._id, status: "absent" }] })
    }
    const quiz = (await adminAgent.post(`/courses/${course._id}/assessments`).send({ title: "Q", maxScore: 10, weight: 100 })).body.assessment
    await adminAgent.put(`/assessments/${quiz._id}/scores`).send({ scores: [{ student: weak._id, score: 3 }] })

    const wes = (await adminAgent.get("/insights/at-risk")).body.students.find(r => r.student.email === "wes@test.com")
    assert.equal(wes.level, "high")
    assert.equal(wes.reasons.length, 3)   // low attendance, failing, missed last 3

    const overview = (await adminAgent.get("/stats/overview")).body
    assert.ok(overview.gradeDistribution.F >= 1)
    assert.ok(overview.attendanceTrend.length >= 3)
    assert.equal(overview.coursePerformance.find(c => c.courseName === "Risk 101").averageLetter, "F")

    const report = (await adminAgent.get(`/students/${weak._id}/report`)).body.report
    assert.equal(report.courses[0].grade.letter, "F")
    assert.equal(report.attendance.pct, 0)

    assert.ok((await adminAgent.get("/me/notifications")).body.notifications.some(n => n.type === "risk"))

    const wesAgent = request.agent(app)
    await wesAgent.post("/logininfo").send({ email: "wes@test.com", password: student.password, role: "student" })
    const notes = (await wesAgent.get("/me/notifications")).body.notifications
    assert.ok(notes.some(n => n.type === "attendance"))
    assert.ok(notes.some(n => n.type === "grade"))
    assert.equal((await wesAgent.get("/me/report")).body.report.courses[0].grade.letter, "F")
    assert.equal((await wesAgent.get(`/students/${weak._id}/report`)).status, 403)
})

test("logout clears the cookie and unknown routes return 404 JSON", async () => {
    const res = await studentAgent.post("/logout")
    assert.equal(res.status, 200)
    assert.equal((await studentAgent.get("/check-auth")).status, 401)

    const missing = await request(app).get("/nope")
    assert.equal(missing.status, 404)
    assert.match(missing.body.msg, /Route not found/)
})
