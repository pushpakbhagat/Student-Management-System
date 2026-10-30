const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const env = require("./config/env");

const Admin = require("./models/admin");
const Student = require("./models/student");
const Course = require("./models/Courses");
const Assignment = require("./models/Assignment");
const AttendanceSession = require("./models/AttendanceSession");
const Assessment = require("./models/Assessment");
const Announcement = require("./models/Announcement");
const { applyCounterChanges } = require("./services/attendance");

const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_TEACHER_PASSWORD = "teacher123";

// Small deterministic random generator, so every seed produces the same demo data
function makeRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

// The last `count` weekdays before today, as midnight-UTC dates
function recentWeekdays(count) {
    const days = [];
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    while (days.length < count) {
        d.setUTCDate(d.getUTCDate() - 1);
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(new Date(d));
    }
    return days.reverse();
}
const DEMO_STUDENT_PASSWORD = "student123";

const seedDatabase = async () => {
    if (!env.mongoUri) {
        console.error("MONGO_URI is not set. Copy .env.example to .env first.");
        process.exit(1);
    }
    if (env.isProduction) {
        console.error("Refusing to seed while NODE_ENV=production.");
        process.exit(1);
    }

    // Seeding wipes data, so make the user confirm which database it will hit
    const dbHost = env.mongoUri.replace(/\/\/[^@]*@/, "//").split("?")[0];
    if (!process.argv.includes("--yes")) {
        console.log(`This will DELETE all admins, students, courses, assignments, attendance, grades and announcements in:\n  ${dbHost}\n`);
        console.log("If that is what you want, run:  npm run seed -- --yes");
        process.exit(0);
    }

    try {
        await mongoose.connect(env.mongoUri);
        console.log("MongoDB connected");

        // ── Clear existing data ──────────────────────
        await Promise.all([
            Admin.deleteMany({}),
            Student.deleteMany({}),
            Course.deleteMany({}),
            Assignment.deleteMany({}),
            AttendanceSession.deleteMany({}),
            Assessment.deleteMany({}),
            Announcement.deleteMany({}),
        ]);
        console.log("Cleared existing data");

        // ── Seed Admin ───────────────────────────────
        await Admin.create({
            firstName: "Super",
            lastName: "Admin",
            email: "admin@studenthub.com",
            password: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10),
            gender: "Male",
            imgURL: "",
        });
        console.log("✅ Admin created");

        // ── Seed Courses ─────────────────────────────
        const courses = await Course.insertMany([
            { courseName: "Mathematics", schedule: [
                { day: 1, start: "09:00", end: "10:00", room: "A-101" },
                { day: 3, start: "09:00", end: "10:00", room: "A-101" },
                { day: 5, start: "11:00", end: "12:00", room: "A-101" },
            ] },
            { courseName: "Physics", schedule: [
                { day: 2, start: "10:00", end: "11:30", room: "Lab B-204" },
                { day: 4, start: "14:00", end: "15:30", room: "Lab B-204" },
            ] },
            { courseName: "Computer Science", schedule: [
                { day: 1, start: "13:00", end: "14:30", room: "Lab C-3" },
                { day: 3, start: "13:00", end: "14:30", room: "Lab C-3" },
                { day: 5, start: "09:00", end: "10:30", room: "Lab C-3" },
            ] },
        ]);
        console.log("✅ Courses created");

        // ── Seed a teacher for two of the courses ────
        const teacher = await Admin.create({
            role: "teacher",
            firstName: "Anita",
            lastName: "Desai",
            email: "teacher@studenthub.com",
            password: await bcrypt.hash(DEMO_TEACHER_PASSWORD, 10),
            gender: "Female",
            imgURL: "",
        });
        await Course.updateMany({ _id: { $in: [courses[0]._id, courses[1]._id] } }, { $set: { teachers: [teacher._id] } });
        console.log("✅ Teacher created");

        // ── Seed Students (each enrolled in every course) ──
        const students = [
            { firstName: "Rahul",   lastName: "Sharma",  email: "rahul@studenthub.com",   gender: "Male"   },
            { firstName: "Priya",   lastName: "Patel",   email: "priya@studenthub.com",   gender: "Female" },
            { firstName: "Aarav",   lastName: "Mehta",   email: "aarav@studenthub.com",   gender: "Male"   },
            { firstName: "Sneha",   lastName: "Reddy",   email: "sneha@studenthub.com",   gender: "Female" },
            { firstName: "Vikram",  lastName: "Singh",   email: "vikram@studenthub.com",  gender: "Male"   },
        ];

        const hashedStudentPassword = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 10);
        const createdStudents = await Student.insertMany(students.map(student => ({
            ...student,
            password: hashedStudentPassword,
            imgURL: "",
            courses: courses.map(course => ({ course: course._id, totalClasses: 0, attendedClasses: 0, marks: 0 })),
        })));

        await Course.updateMany({}, { $set: { students: createdStudents.map(s => s._id) } });
        console.log("✅ Students created and enrolled");

        // ── Seed Assignments ─────────────────────────
        const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        for (const course of courses) {
            const assignment = await Assignment.create({
                course: course._id,
                title: `${course.courseName} — Assignment 1`,
                description: `First assignment for ${course.courseName}`,
                dueDate: inTwoWeeks,
            });
            await Course.updateOne({ _id: course._id }, { $push: { assignments: assignment._id } });
        }
        console.log("✅ Assignments created");

        // ── Seed two weeks of attendance ─────────────
        // each student gets their own "reliability", so the dashboards have something to show
        const random = makeRandom(42);
        const reliability = new Map(createdStudents.map((s, i) => [String(s._id), [0.97, 0.9, 0.82, 0.7, 0.93][i % 5]]));
        for (const course of courses) {
            for (const date of recentWeekdays(10)) {
                const records = createdStudents.map(s => {
                    const r = random();
                    const p = reliability.get(String(s._id));
                    const status = r < p ? (r < p - 0.08 ? "present" : "late") : r > 0.97 ? "excused" : "absent";
                    return { student: s._id, status };
                });
                await AttendanceSession.create({ course: course._id, date, records });
                await applyCounterChanges(course._id, [], records);
            }
        }
        console.log("✅ Attendance history created");

        // ── Seed assessments with scores ─────────────
        const plan = [
            { title: "Quiz 1", kind: "quiz", maxScore: 20, weight: 15, daysAgo: 12 },
            { title: "Assignment 1", kind: "assignment", maxScore: 50, weight: 25, daysAgo: 7 },
            { title: "Midterm", kind: "midterm", maxScore: 100, weight: 60, daysAgo: 2 },
        ];
        for (const course of courses) {
            for (const item of plan) {
                const scores = createdStudents.map((s, i) => {
                    const ability = [0.92, 0.84, 0.76, 0.63, 0.88][i % 5];
                    const pct = Math.min(1, Math.max(0.35, ability + (random() - 0.5) * 0.16));
                    return { student: s._id, score: Math.round(pct * item.maxScore) };
                });
                await Assessment.create({
                    course: course._id,
                    title: item.title,
                    kind: item.kind,
                    maxScore: item.maxScore,
                    weight: item.weight,
                    date: new Date(Date.now() - item.daysAgo * 86400000),
                    scores,
                });
            }
        }
        console.log("✅ Grades created");

        // ── Seed announcements ───────────────────────
        const admin = await Admin.findOne({ email: "admin@studenthub.com" });
        await Announcement.create([
            { title: "Welcome to the new term!", body: "Check your dashboard for courses, attendance and upcoming deadlines.", author: admin._id, pinned: true },
            { title: `${courses[1].courseName} lab moved to Thursday`, body: "This week's lab session moves to Thursday 2pm, room B-204.", course: courses[1]._id, author: admin._id },
        ]);
        console.log("✅ Announcements created");

        console.log("\n🎉 Database seeded successfully!");
        console.log("─────────────────────────────────");
        console.log(`Admin   → admin@studenthub.com   / ${DEMO_ADMIN_PASSWORD}`);
        console.log(`Teacher → teacher@studenthub.com / ${DEMO_TEACHER_PASSWORD}`);
        console.log(`Student → rahul@studenthub.com   / ${DEMO_STUDENT_PASSWORD}`);
        console.log("─────────────────────────────────");

    } catch (err) {
        console.error("Seeding failed:", err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }
};

seedDatabase();
