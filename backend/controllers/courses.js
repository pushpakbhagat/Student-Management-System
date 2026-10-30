
const Course = require("../models/Courses");
const Student = require("../models/student")
const Assignment = require("../models/Assignment")
const AttendanceSession = require("../models/AttendanceSession")
const Assessment = require("../models/Assessment")
const Announcement = require("../models/Announcement")
const { HttpError, isValidId, assertValidId } = require("../utils/http")

function newEnrollment(courseId) {
    return { course: courseId, totalClasses: 0, attendedClasses: 0, marks: 0 }
}

function isEnrolled(student, courseId) {
    return student.courses.some(c => c.course?.toString() === courseId.toString())
}

// COURSES ------------------------------------------------------------------------
async function handleNewCourse(req, res) {
    const courseName = typeof req.body?.courseName === "string" ? req.body.courseName.trim() : ""
    if (!courseName) {
        throw new HttpError(400, "Enter course name")
    }

    const course = await Course.create({ courseName })
    return res.status(201).json({ msg: "Course created", course })
}

// Admins get full rosters; students only see the names of their own courses
async function getAllCourses(req, res) {
    if (req.user.role === "admin") {
        const courses = await Course.find({}).sort({ courseName: 1 })
        return res.status(200).json({ msg: "Courses fetched", Courses: courses })
    }

    const enrolledIds = req.account.courses.map(c => c.course)
    const courses = await Course.find({ _id: { $in: enrolledIds } }, "courseName").sort({ courseName: 1 })
    return res.status(200).json({ msg: "Courses fetched", Courses: courses })
}

// Deleting a course also un-enrolls its students and deletes everything that belongs to it
async function deleteCourse(req, res) {
    const { CourseId } = req.params
    assertValidId(CourseId, "course id")

    const deletedCourse = await Course.findByIdAndDelete(CourseId)
    if (!deletedCourse) {
        throw new HttpError(404, "Course not found")
    }

    const students = await Student.updateMany(
        { "courses.course": CourseId },
        { $pull: { courses: { course: CourseId } } }
    )
    await Promise.all([
        Assignment.deleteMany({ course: CourseId }),
        AttendanceSession.deleteMany({ course: CourseId }),
        Assessment.deleteMany({ course: CourseId }),
        Announcement.deleteMany({ course: CourseId }),
    ])

    return res.status(200).json({ msg: "Course deleted", deletedCourse, students })
}

// ENROLLMENT ---------------------------------------------------------------------
async function enrollStudentInCourse(req, res) {
    const { CourseId, StudentId } = req.body ?? {}
    assertValidId(StudentId, "student id")
    assertValidId(CourseId, "course id")

    const [student, course] = await Promise.all([Student.findById(StudentId), Course.findById(CourseId)])
    if (!student) throw new HttpError(404, "Student not found")
    if (!course) throw new HttpError(404, "Course not found")

    if (isEnrolled(student, CourseId)) {
        throw new HttpError(409, "Student already enrolled")
    }

    student.courses.push(newEnrollment(CourseId))
    await student.save()
    await Course.updateOne({ _id: CourseId }, { $addToSet: { students: student._id } })

    return res.status(200).json({ msg: "Student enrolled successfully", Student: student })
}

async function enrollStudentInMultipleCourses(req, res) {
    const { AppliedCourses, StudentId } = req.body ?? {}
    assertValidId(StudentId, "student id")
    if (!Array.isArray(AppliedCourses)) {
        throw new HttpError(400, "AppliedCourses must be a list of course ids")
    }

    const student = await Student.findById(StudentId)
    if (!student) throw new HttpError(404, "Student not found")

    const validIds = AppliedCourses.filter(isValidId)
    const existingCourses = await Course.find({ _id: { $in: validIds } }, "_id")
    const existingIds = new Set(existingCourses.map(c => c._id.toString()))

    const enrolled = []
    const skipped = []
    for (const CourseId of AppliedCourses) {
        if (!existingIds.has(String(CourseId))) {
            skipped.push({ CourseId, reason: "Course not found" })
        } else if (isEnrolled(student, CourseId)) {
            skipped.push({ CourseId, reason: "Already enrolled" })
        } else {
            student.courses.push(newEnrollment(CourseId))
            enrolled.push(CourseId)
        }
    }

    await student.save()
    await Course.updateMany({ _id: { $in: enrolled } }, { $addToSet: { students: student._id } })

    return res.status(200).json({ msg: "Student enrolled successfully", Student: student, enrolled, skipped })
}

async function enrollMultipleStudentsInSingleCourse(req, res) {
    const { StudentsIds, CourseId } = req.body ?? {}
    assertValidId(CourseId, "course id")
    if (!Array.isArray(StudentsIds)) {
        throw new HttpError(400, "StudentsIds must be a list of student ids")
    }

    const course = await Course.findById(CourseId)
    if (!course) throw new HttpError(404, "Course not found")

    const students = await Student.find({ _id: { $in: StudentsIds.filter(isValidId) } })

    const enrolledStudents = []
    for (const student of students) {
        if (isEnrolled(student, CourseId)) continue
        student.courses.push(newEnrollment(CourseId))
        await student.save()
        enrolledStudents.push(student)
    }

    await Course.updateOne(
        { _id: CourseId },
        { $addToSet: { students: { $each: enrolledStudents.map(s => s._id) } } }
    )

    return res.status(200).json({ msg: "Students enrolled successfully", students: enrolledStudents })
}

// Removes the student from the course roster and drops their attendance/marks for it
async function unenrollStudent(req, res) {
    const { CourseId, StudentId } = req.params
    assertValidId(CourseId, "course id")
    assertValidId(StudentId, "student id")

    const student = await Student.findOneAndUpdate(
        { _id: StudentId, "courses.course": CourseId },
        { $pull: { courses: { course: CourseId } } },
        { returnDocument: "after" }
    )
    if (!student) {
        throw new HttpError(404, "Student is not enrolled in this course")
    }
    await Promise.all([
        Course.updateOne({ _id: CourseId }, { $pull: { students: student._id } }),
        // their history in this course goes too (the UI warns about this)
        AttendanceSession.updateMany({ course: CourseId }, { $pull: { records: { student: student._id } } }),
        Assessment.updateMany({ course: CourseId }, { $pull: { scores: { student: student._id } } }),
    ])

    return res.status(200).json({ msg: "Student removed from course", Student: student })
}


module.exports = {
    handleNewCourse,
    getAllCourses,
    deleteCourse,
    enrollStudentInCourse,
    enrollStudentInMultipleCourses,
    enrollMultipleStudentsInSingleCourse,
    unenrollStudent,
}
