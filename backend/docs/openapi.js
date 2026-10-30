// OpenAPI description of the StudentHub API, served as JSON at /docs/openapi.json and
// browsable at /docs. test/api.test.js checks that every Express route is listed here.

const id = { type: "string", pattern: "^[0-9a-f]{24}$", example: "6650c4e2a1b2c3d4e5f60718" }
const day = { type: "string", format: "date", example: "2030-01-15" }
const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema) => ({ content: { "application/json": { schema } } })
const body = (properties, required = []) => ({ required: true, ...json({ type: "object", properties, required }) })
const ok = (description, schema) => ({ description, ...(schema ? json(schema) : {}) })
const pathId = (name, description = "MongoDB id") => ({ name, in: "path", required: true, description, schema: id })

// Who may call an operation: shown in its description, enforced by the server
const WHO = {
    anyone: "Anyone.",
    signedIn: "Any signed-in user.",
    student: "Students only.",
    staff: "Admins and teachers. Teachers are limited to the courses they're assigned.",
    admin: "Admins only.",
}

function op(tag, summary, who, extra = {}) {
    const { responses = {}, ...rest } = extra
    return {
        tags: [tag],
        summary,
        description: WHO[who],
        ...(who === "anyone" ? { security: [] } : {}),
        ...rest,
        responses: {
            200: ok("OK"),
            ...responses,
            ...(who === "anyone" ? {} : { 401: ok("Not signed in", ref("Error")), 403: ok("Not allowed", ref("Error")) }),
        },
    }
}

const status = { type: "string", enum: ["present", "late", "absent", "excused"] }
const KINDS = ["quiz", "assignment", "midterm", "final", "project", "other"]

module.exports = {
    openapi: "3.0.3",
    info: {
        title: "StudentHub API",
        version: "2.0.0",
        description: [
            "REST API behind the StudentHub web app: students, courses, attendance, grades, assignments, announcements and insights.",
            "",
            "**Signing in:** call `POST /logininfo` (or `POST /demo-login` when demo mode is on). The server sets an httpOnly `token` cookie, and the browser sends it with every later request, including the ones you try from this page.",
            "",
            "**Errors** are always JSON: `{ \"msg\": \"...\" }`. State-changing requests must send JSON and come from the app's own origin (or this page).",
        ].join("\n"),
    },
    // relative, so it also works behind a proxy that serves the API under a prefix (Docker: /api/docs/)
    servers: [{ url: "../", description: "This server" }],
    security: [{ cookieAuth: [] }],
    tags: [
        { name: "Auth", description: "Signing in and out, your own account" },
        { name: "Students" },
        { name: "Courses", description: "Courses, enrollment, teachers and class times" },
        { name: "Attendance", description: "Attendance by day and QR check-in" },
        { name: "Grades", description: "Weighted gradebook" },
        { name: "Assignments", description: "Assignments and hand-ins" },
        { name: "Announcements" },
        { name: "Insights", description: "Dashboards, report cards and notifications" },
        { name: "System" },
    ],
    components: {
        securitySchemes: {
            cookieAuth: { type: "apiKey", in: "cookie", name: "token", description: "Set by /logininfo; httpOnly, so scripts can't read it." },
        },
        schemas: {
            Error: { type: "object", properties: { msg: { type: "string", example: "Something went wrong" } } },
            Enrollment: {
                type: "object",
                properties: { course: id, totalClasses: { type: "integer" }, attendedClasses: { type: "integer" }, marks: { type: "number" } },
            },
            Student: {
                type: "object",
                properties: {
                    _id: id,
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    gender: { type: "string", enum: ["Male", "Female", "Other"] },
                    email: { type: "string", format: "email" },
                    imgURL: { type: "string", description: "https URL or a small data:image URL" },
                    courses: { type: "array", items: ref("Enrollment") },
                },
            },
            StudentPage: {
                type: "object",
                properties: {
                    students: { type: "array", items: ref("Student") },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pages: { type: "integer" },
                    limit: { type: "integer" },
                },
            },
            Slot: {
                type: "object",
                required: ["day", "start", "end"],
                properties: {
                    day: { type: "integer", minimum: 0, maximum: 6, description: "0 = Sunday" },
                    start: { type: "string", example: "09:00" },
                    end: { type: "string", example: "10:30" },
                    room: { type: "string", example: "A-101" },
                },
            },
            Course: {
                type: "object",
                properties: {
                    _id: id,
                    courseName: { type: "string" },
                    students: { type: "array", items: id },
                    teachers: { type: "array", items: id },
                    schedule: { type: "array", items: ref("Slot") },
                },
            },
            Assignment: {
                type: "object",
                properties: { _id: id, title: { type: "string" }, description: { type: "string" }, dueDate: { type: "string", format: "date-time" }, course: id },
            },
            Session: {
                type: "object",
                properties: {
                    _id: id,
                    course: id,
                    date: { type: "string", format: "date-time" },
                    topic: { type: "string" },
                    checkinOpen: { type: "boolean" },
                    records: { type: "array", items: { type: "object", properties: { student: id, status } } },
                },
            },
            Assessment: {
                type: "object",
                properties: {
                    _id: id,
                    course: id,
                    title: { type: "string" },
                    kind: { type: "string", enum: KINDS },
                    maxScore: { type: "number" },
                    weight: { type: "number", description: "Share of the course grade, in %" },
                    date: { type: "string", format: "date-time" },
                    scores: { type: "array", items: { type: "object", properties: { student: id, score: { type: "number" } } } },
                },
            },
            Announcement: {
                type: "object",
                properties: { _id: id, title: { type: "string" }, body: { type: "string" }, course: { ...id, nullable: true, description: "null = everyone" }, pinned: { type: "boolean" } },
            },
            Submission: {
                type: "object",
                properties: {
                    _id: id,
                    assignment: id,
                    student: id,
                    text: { type: "string" },
                    file: { type: "object", properties: { name: { type: "string" }, type: { type: "string" }, size: { type: "integer" } } },
                    submittedAt: { type: "string", format: "date-time" },
                    late: { type: "boolean" },
                    score: { type: "number" },
                    feedback: { type: "string" },
                    gradedAt: { type: "string", format: "date-time" },
                },
            },
            Records: {
                type: "array",
                items: { type: "object", required: ["student", "status"], properties: { student: id, status } },
            },
        },
    },
    paths: {
        // SYSTEM
        "/health": { get: op("System", "Health check", "anyone", { responses: { 200: ok("Running", { type: "object", properties: { status: { type: "string", example: "ok" } } }) } }) },

        // AUTH
        "/logininfo": {
            post: op("Auth", "Sign in", "anyone", {
                description: "Anyone. Rate limited. Sets the `token` cookie and returns the data the app needs to start.",
                requestBody: body({ email: { type: "string", example: "admin@studenthub.com" }, password: { type: "string", example: "admin123" }, role: { type: "string", enum: ["admin", "teacher", "student"] } }, ["email", "password", "role"]),
                responses: { 401: ok("Wrong email or password", ref("Error")) },
            }),
        },
        "/demo-login": {
            post: op("Auth", "Sign in to a demo account", "anyone", {
                description: "Anyone, only when the server runs with `DEMO_MODE=true`.",
                requestBody: body({ role: { type: "string", enum: ["admin", "teacher", "student"] } }, ["role"]),
                responses: { 404: ok("Demo mode is off", ref("Error")) },
            }),
        },
        "/logout": { post: op("Auth", "Sign out (clears the cookie)", "anyone") },
        "/check-auth": { get: op("Auth", "Is my session still valid?", "signedIn") },
        "/me": { get: op("Auth", "My account", "signedIn") },
        "/me/password": {
            patch: op("Auth", "Change my password", "signedIn", {
                description: "Any signed-in user. Rate limited. Signs out your other devices.",
                requestBody: body({ currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 8, maxLength: 72 } }, ["currentPassword", "newPassword"]),
            }),
        },
        "/me/photo": { patch: op("Auth", "Set or remove my profile photo", "signedIn", { requestBody: body({ imgURL: { type: "string" } }) }) },
        "/setup-status": { get: op("Auth", "Is first-admin sign-up open? Is demo mode on?", "anyone") },
        "/admins": {
            post: op("Auth", "Create an admin or teacher", "anyone", {
                description: "Anyone while no admin exists (the first admin signs up). After that, admins only.",
                requestBody: body({
                    firstName: { type: "string" }, lastName: { type: "string" }, gender: { type: "string" },
                    email: { type: "string", format: "email" }, password: { type: "string" }, role: { type: "string", enum: ["admin", "teacher"] },
                }, ["firstName", "lastName", "gender", "email", "password"]),
                responses: { 201: ok("Created"), 403: ok("Sign-up is closed", ref("Error")) },
            }),
        },
        "/staff": { get: op("Auth", "All admins and teachers, with the courses each teaches", "admin") },

        // STUDENTS
        "/students": {
            get: op("Students", "List students (all, or one page)", "staff", {
                description: `${WHO.staff} Without parameters the whole list comes back as an array. With any of the parameters below you get one page instead.`,
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                    { name: "q", in: "query", description: "Search names and email; every word has to match", schema: { type: "string" } },
                    { name: "course", in: "query", description: "Only students in this course", schema: id },
                ],
                responses: { 200: ok("Students", { oneOf: [{ type: "array", items: ref("Student") }, ref("StudentPage")] }) },
            }),
            post: op("Students", "Add a student", "admin", {
                requestBody: body({
                    firstName: { type: "string" }, lastName: { type: "string" }, gender: { type: "string" },
                    email: { type: "string", format: "email" }, password: { type: "string" }, imgURL: { type: "string" },
                }, ["firstName", "lastName", "gender", "email", "password"]),
                responses: { 201: ok("Created", ref("Student")) },
            }),
        },
        "/students/email/{email}": {
            get: op("Students", "Look up a student by email", "signedIn", {
                description: "Admins: anyone. Teachers: students in their courses. Students: themselves.",
                parameters: [{ name: "email", in: "path", required: true, schema: { type: "string" } }],
            }),
        },
        // the API updates by email and deletes by id; OpenAPI allows only one name per path segment
        "/students/{key}": {
            patch: op("Students", "Update a student (key = their email)", "admin", {
                parameters: [{ name: "key", in: "path", required: true, description: "The student's current email", schema: { type: "string" } }],
                requestBody: body({ firstName: { type: "string" }, lastName: { type: "string" }, gender: { type: "string" }, email: { type: "string" }, password: { type: "string" }, imgURL: { type: "string" } }),
            }),
            delete: op("Students", "Delete a student and everything recorded for them (key = their id)", "admin", { parameters: [{ ...pathId("key"), description: "The student's id" }] }),
        },
        "/students/{id}/report": { get: op("Insights", "A student's report card", "staff", { parameters: [pathId("id")] }) },

        // COURSES
        "/courses": {
            get: op("Courses", "Courses I can see", "signedIn", { description: "Admins: all. Teachers: theirs. Students: the ones they're enrolled in (name and class times only)." }),
            post: op("Courses", "Create a course", "admin", { requestBody: body({ courseName: { type: "string" } }, ["courseName"]), responses: { 201: ok("Created", ref("Course")) } }),
        },
        "/courses/{CourseId}": { delete: op("Courses", "Delete a course and everything that belongs to it", "admin", { parameters: [pathId("CourseId")] }) },
        "/enrollcourse": { post: op("Courses", "Enroll one student in one course", "admin", { requestBody: body({ StudentId: id, CourseId: id }, ["StudentId", "CourseId"]) }) },
        "/enrollmultiplecourses": { patch: op("Courses", "Enroll one student in several courses", "admin", { requestBody: body({ StudentId: id, AppliedCourses: { type: "array", items: id } }, ["StudentId", "AppliedCourses"]) }) },
        "/enrollmultiplestudents": { patch: op("Courses", "Enroll several students in one course", "admin", { requestBody: body({ CourseId: id, StudentsIds: { type: "array", items: id } }, ["CourseId", "StudentsIds"]) }) },
        "/courses/{CourseId}/students/{StudentId}": {
            delete: op("Courses", "Remove a student from a course (their attendance and grades there are deleted)", "admin", { parameters: [pathId("CourseId"), pathId("StudentId")] }),
        },
        "/courses/{CourseId}/teachers": { put: op("Courses", "Set who teaches a course", "admin", { parameters: [pathId("CourseId")], requestBody: body({ teacherIds: { type: "array", items: id } }, ["teacherIds"]) }) },
        "/courses/{CourseId}/schedule": {
            put: op("Courses", "Set a course's weekly class times", "admin", { parameters: [pathId("CourseId")], requestBody: body({ schedule: { type: "array", maxItems: 20, items: ref("Slot") } }, ["schedule"]) }),
        },

        // ATTENDANCE
        "/courses/{CourseId}/sessions": {
            get: op("Attendance", "Attendance days recorded for a course", "staff", { parameters: [pathId("CourseId")], responses: { 200: ok("Sessions", { type: "object", properties: { sessions: { type: "array", items: ref("Session") } } }) } }),
            post: op("Attendance", "Record a day", "staff", {
                parameters: [pathId("CourseId")],
                requestBody: body({ date: day, topic: { type: "string" }, records: ref("Records") }, ["date"]),
                responses: { 201: ok("Recorded"), 409: ok("That day is already recorded", ref("Error")) },
            }),
        },
        "/sessions/{id}": {
            patch: op("Attendance", "Edit a recorded day", "staff", { parameters: [pathId("id")], requestBody: body({ topic: { type: "string" }, records: ref("Records") }) }),
            delete: op("Attendance", "Delete a recorded day", "staff", { parameters: [pathId("id")] }),
        },
        "/me/attendance": { get: op("Attendance", "My day-by-day attendance", "student") },
        "/courses/{CourseId}/checkin": {
            post: op("Attendance", "Open today's QR check-in", "staff", {
                description: `${WHO.staff} Returns a code for the QR image that is only valid for about 20–40 seconds.`,
                parameters: [pathId("CourseId")],
                requestBody: body({ date: { ...day, description: "Today, in the teacher's time zone" } }, ["date"]),
            }),
        },
        "/sessions/{id}/checkin": { get: op("Attendance", "Current QR code and who has checked in", "staff", { parameters: [pathId("id")] }) },
        "/sessions/{id}/finish": { post: op("Attendance", "Close check-in and mark everyone else absent", "staff", { parameters: [pathId("id")] }) },
        "/checkin": {
            post: op("Attendance", "Check in with a scanned code", "student", {
                description: "Students only. Rate limited.",
                requestBody: body({ token: { type: "string" } }, ["token"]),
                responses: { 400: ok("Code expired or check-in closed", ref("Error")) },
            }),
        },

        // GRADES
        "/courses/{CourseId}/assessments": {
            get: op("Grades", "A course's gradebook", "staff", { parameters: [pathId("CourseId")] }),
            post: op("Grades", "Add a quiz, exam or other assessment", "staff", {
                parameters: [pathId("CourseId")],
                requestBody: body({ title: { type: "string" }, kind: { type: "string", enum: KINDS }, maxScore: { type: "number" }, weight: { type: "number" }, date: day }, ["title", "maxScore", "weight"]),
                responses: { 201: ok("Created", ref("Assessment")) },
            }),
        },
        "/assessments/{id}": {
            patch: op("Grades", "Edit an assessment", "staff", { parameters: [pathId("id")], requestBody: body({ title: { type: "string" }, kind: { type: "string" }, maxScore: { type: "number" }, weight: { type: "number" }, date: day }) }),
            delete: op("Grades", "Delete an assessment", "staff", { parameters: [pathId("id")] }),
        },
        "/assessments/{id}/scores": {
            put: op("Grades", "Save scores (a missing score means not graded yet)", "staff", {
                parameters: [pathId("id")],
                requestBody: body({ scores: { type: "array", items: { type: "object", properties: { student: id, score: { type: "number", nullable: true } } } } }, ["scores"]),
            }),
        },
        "/me/grades": { get: op("Grades", "My scores, grades and GPA", "student") },

        // ASSIGNMENTS
        "/assignments": {
            get: op("Assignments", "Assignments I can see", "signedIn"),
            post: op("Assignments", "Create an assignment", "staff", {
                requestBody: body({ CourseId: id, title: { type: "string" }, description: { type: "string" }, dueDate: day }, ["CourseId", "title", "dueDate"]),
                responses: { 201: ok("Created", ref("Assignment")) },
            }),
        },
        "/assignments/course/{courseId}": { get: op("Assignments", "Assignments for one course", "signedIn", { parameters: [pathId("courseId")] }) },
        "/assignments/{id}": {
            patch: op("Assignments", "Edit an assignment", "staff", { parameters: [pathId("id")], requestBody: body({ title: { type: "string" }, description: { type: "string" }, dueDate: day }) }),
            delete: op("Assignments", "Delete an assignment and its hand-ins", "staff", { parameters: [pathId("id")] }),
        },
        "/assignments/{id}/submission": {
            get: op("Assignments", "My hand-in for an assignment", "student", { parameters: [pathId("id")] }),
            put: op("Assignments", "Hand in (or replace a hand-in until it's graded)", "student", {
                description: "Students only. Send a written answer, a file, or both. Files: PDF, PNG, JPEG, WebP, plain text or Word, at most 2 MB, as base64.",
                parameters: [pathId("id")],
                requestBody: body({
                    text: { type: "string", maxLength: 5000 },
                    file: { type: "object", properties: { name: { type: "string" }, type: { type: "string", example: "application/pdf" }, data: { type: "string", format: "byte" } } },
                }),
                responses: { 200: ok("Saved", { type: "object", properties: { submission: ref("Submission") } }), 409: ok("Already graded", ref("Error")) },
            }),
        },
        "/me/submissions": { get: op("Assignments", "All my hand-ins", "student") },
        "/assignments/{id}/submissions": { get: op("Assignments", "Everyone in the course, with their hand-in", "staff", { parameters: [pathId("id")] }) },
        "/submissions/{id}/grade": {
            patch: op("Assignments", "Grade a hand-in", "staff", { parameters: [pathId("id")], requestBody: body({ score: { type: "number", minimum: 0, maximum: 100 }, feedback: { type: "string" } }, ["score"]) }),
        },
        "/submissions/{id}/file": {
            get: op("Assignments", "Download the file of a hand-in", "signedIn", {
                description: "The student who handed it in, or staff who teach the course.",
                parameters: [pathId("id")],
                responses: { 200: { description: "The file, as an attachment", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } } },
            }),
        },

        // ANNOUNCEMENTS
        "/announcements": {
            get: op("Announcements", "Announcements I can see", "signedIn", { description: "Students get the ones for everyone plus their courses'; pinned first." }),
            post: op("Announcements", "Post an announcement", "staff", {
                description: `${WHO.staff} Only admins can post to everyone (no course).`,
                requestBody: body({ title: { type: "string" }, body: { type: "string" }, course: { ...id, nullable: true }, pinned: { type: "boolean" } }, ["title"]),
                responses: { 201: ok("Posted", ref("Announcement")) },
            }),
        },
        "/announcements/{id}": {
            patch: op("Announcements", "Edit an announcement", "staff", { parameters: [pathId("id")], requestBody: body({ title: { type: "string" }, body: { type: "string" }, pinned: { type: "boolean" } }) }),
            delete: op("Announcements", "Delete an announcement", "staff", { parameters: [pathId("id")] }),
        },

        // INSIGHTS
        "/insights/at-risk": { get: op("Insights", "Students who need attention (low attendance, failing grades, absence streaks)", "staff") },
        "/stats/overview": { get: op("Insights", "Chart data: attendance trend, grade distribution, course performance", "staff") },
        "/me/report": { get: op("Insights", "My report card", "student") },
        "/me/notifications": { get: op("Insights", "My notifications", "signedIn") },
    },
}
