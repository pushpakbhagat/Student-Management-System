const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const env = require("./config/env");

const Admin = require("./models/admin");
const Student = require("./models/student");
const Course = require("./models/Courses");
const Assignment = require("./models/Assignment");

const DEMO_ADMIN_PASSWORD = "admin123";
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
        console.log(`This will DELETE all admins, students, courses and assignments in:\n  ${dbHost}\n`);
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
            { courseName: "Mathematics" },
            { courseName: "Physics" },
            { courseName: "Computer Science" },
        ]);
        console.log("✅ Courses created");

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

        console.log("\n🎉 Database seeded successfully!");
        console.log("─────────────────────────────────");
        console.log(`Admin   → admin@studenthub.com   / ${DEMO_ADMIN_PASSWORD}`);
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
