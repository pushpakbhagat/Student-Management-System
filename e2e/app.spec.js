// End-to-end tests: a real browser against the real app, API and a seeded database.
const { test, expect } = require("@playwright/test")

async function signInAsDemo(page, role) {
    await page.goto("/")
    await page.getByRole("button", { name: new RegExp(`try as.*${role}`, "i") }).click()
    await expect(page).toHaveURL(role === "student" ? /\/student\/dashboard/ : /\/admin\/dashboard/)
}

test("a wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/")
    await page.getByText("Admin", { exact: true }).click()
    await page.getByLabel("Email").fill("admin@studenthub.com")
    await page.getByLabel("Password").fill("not-the-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByRole("alert")).toHaveText("Wrong email or password")
    await expect(page).toHaveURL(/\/$/)
})

test("a student hands in an assignment @phone", async ({ page }) => {
    await signInAsDemo(page, "student")
    await page.goto("/student/assignments")
    await page.getByRole("button", { name: "Hand in" }).first().click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Your answer").fill("My answers, from the end-to-end test.")
    await dialog.getByRole("button", { name: "Hand in" }).click()

    await expect(page.getByText("Handed in 🎉")).toBeVisible()
    await expect(page.getByRole("button", { name: "View" }).first()).toBeVisible()
})

test("a teacher records today's attendance", async ({ page }) => {
    await signInAsDemo(page, "teacher")
    await page.getByRole("link", { name: "Attendance", exact: true }).click()
    await page.getByRole("button", { name: "All present" }).click()
    await page.getByRole("button", { name: /^(Save|Update)$/ }).click()
    await expect(page.getByText(/Attendance (saved|updated)/)).toBeVisible()
})

test("an admin searches students on the server and opens the timetable", async ({ page }) => {
    await signInAsDemo(page, "admin")
    await page.getByRole("link", { name: "Students", exact: true }).click()

    const students = page.locator("main")
    await expect(students.getByText("rahul@studenthub.com").filter({ visible: true })).toHaveCount(1)
    const search = page.waitForResponse((r) => r.url().includes("/api/students?") && r.url().includes("q=priya"))
    await page.getByLabel("Search students").fill("priya")
    await search
    await expect(students.getByText("priya@studenthub.com").filter({ visible: true })).toHaveCount(1)
    await expect(students.getByText("rahul@studenthub.com").filter({ visible: true })).toHaveCount(0)

    await page.getByRole("link", { name: "Timetable", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Timetable" })).toBeVisible()
    await expect(page.getByText("Mathematics").filter({ visible: true }).first()).toBeVisible()
})

test("QR check-in: a student scans the teacher's code", async ({ browser }) => {
    const teacher = await (await browser.newContext()).newPage()
    const student = await (await browser.newContext()).newPage()
    await signInAsDemo(teacher, "teacher")
    await signInAsDemo(student, "student")

    await teacher.getByRole("link", { name: "Attendance", exact: true }).click()
    const opened = teacher.waitForResponse((r) => /\/api\/courses\/[^/]+\/checkin$/.test(r.url()) && r.request().method() === "POST")
    await teacher.getByRole("button", { name: "QR check-in" }).click()
    const { token } = await (await opened).json()
    const live = teacher.getByRole("dialog", { name: /Live check-in/ })
    await expect(live.getByAltText("Check-in QR code")).toBeVisible()

    // what the phone camera would open
    await student.goto(`/student/checkin?c=${encodeURIComponent(token)}`)
    await expect(student.getByRole("heading", { name: /checked in/i })).toBeVisible()

    await expect(live.getByText("Rahul Sharma")).toBeVisible()   // appears on the next poll
    await live.getByRole("button", { name: /Finish/ }).click()
    await expect(teacher.getByText(/Check-in closed/)).toBeVisible()
})
