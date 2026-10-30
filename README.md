# 🎓 Student Management System (Student Hub)

A full-stack web application built using the MERN stack to manage student records, courses, attendance, grades, assignments and announcements, with role-based access for admins, teachers and students.

---

## 🚀 Features

* 🔐 **Security**
  * JWT in an httpOnly cookie with expiry; the account is re-checked on every request, so deleted users lose access immediately
  * Role-based access enforced by the server; students only ever see their own courses and assignments
  * CSRF protection (origin check, JSON-only bodies), login rate limiting, Helmet headers
  * bcrypt-hashed passwords that are never sent to the browser; changing a password signs out other devices

* 👥 **Three roles** – admins run everything; teachers manage attendance, grades, assignments and announcements for the courses they're assigned; students see only their own data
* 👨‍🎓 **Students** – searchable directory, add/edit with course enrollment, delete with confirmation
* 📚 **Courses** – create/delete courses, manage each course's roster, teachers and weekly class times
* 🗓️ **Timetable** – a weekly view for students and staff, plus "today's classes" on the student dashboard
* ✅ **Attendance by date** – record each class day (present / late / absent / excused), edit or delete past days; students see their day-by-day history
* 📷 **QR check-in** – put a QR code on the classroom screen; students scan it with their phone camera to mark themselves present. The code changes every few seconds so a photo of it is useless outside the room; finishing marks everyone else absent
* 🎓 **Gradebook** – weighted quizzes, assignments and exams per course; grades (%, letter, GPA) update live as you type
* 📝 **Assignments & hand-ins** – per-course assignments with due dates; students hand in a written answer and/or a file (PDF, image, Word, text, up to 2 MB); teachers download, grade and leave feedback; late hand-ins are flagged
* 📣 **Announcements** – for everyone or one course, with pinning; shown on students' dashboards
* 📈 **Insights** – attendance trend, grade distribution and course performance charts; an "at risk" list (low attendance, failing grades, absence streaks)
* 🧾 **Report cards** – per student, printable or "save as PDF" from the browser
* 🔔 **Notifications** – a bell menu with new announcements, new grades, upcoming deadlines and attendance warnings for students, and at-risk students, hand-ins to grade and unrecorded attendance for staff
* 🌗 **Light & dark mode**, ⌘/Ctrl + K command palette, smooth animations, skeleton loading
* 📱 **Mobile-friendly and installable** – responsive layouts, and it can be installed as an app (PWA) that opens even without a connection
* 📤 **CSV export** of students, attendance and grades; profile photo upload
* 🧪 **Demo mode** – one-click "Try as admin / teacher / student" on the login page (`DEMO_MODE=true`)
* ⚙️ **Account settings** – change your password and photo; admins can add admins and teachers

---

## 🛠️ Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, Vite, Tailwind CSS, Zustand, React Router |
| Backend  | Node.js, Express 5, Mongoose |
| Database | MongoDB |
| Auth     | JSON Web Tokens, bcrypt |
| Tests    | node:test, Supertest, mongodb-memory-server |

---

## 📁 Folder Structure

```
backend/
  app.js            Express app (middleware + routes)
  index.js          connects to MongoDB and starts the server
  config/env.js     reads and checks environment variables
  controllers/      request handlers
  models/           Mongoose schemas
  routes/           URL → controller mapping, with auth guards
  middlewares/      auth guards, CSRF check, request logger, error handler
  services/         JWT + cookie + password helpers, grades, attendance counters, QR codes, course scoping
  seed.js           fills a database with demo data
  test/             API tests
frontend/
  src/pages/        route pages (admin/, student/, login, register)
  src/components/   app shell, route guards and reusable UI (ui/)
  src/store/        Zustand stores: session, admin data, student portal data
  src/lib/          formatting, timetable, file and PWA helpers
  public/sw.js      service worker (installable app, works offline)
  src/api.js        axios instance used for every API call
.github/workflows/  CI: backend tests + audit, frontend lint + build
```

---

## ⚙️ Getting Started

**Requirements:** Node.js 20+ and a MongoDB database (local or a free [Atlas](https://www.mongodb.com/atlas) cluster).

### 1. Clone and install

```bash
git clone https://github.com/pushpakbhagat/Student-Management-System.git
cd Student-Management-System
npm run setup
```

`npm run setup` installs the root, backend and frontend dependencies.

### 2. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill it in:

```
MONGO_URI=mongodb://127.0.0.1:27017/studenthub
JWT_SECRET=<long random string>
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The frontend needs no `.env` in development.

**No MongoDB?** Use `MONGO_URI=mongodb://127.0.0.1:27017/studenthub` and start with `npm run dev:local` (step 4). It runs a local MongoDB for you, with no install or Atlas account needed, and keeps its data in `backend/.local-db`.

### 3. Add demo data (optional)

⚠️ This **deletes** all existing admins, students, courses and assignments in the database from `MONGO_URI`.

```bash
npm run seed -- --yes
```

Demo logins: `admin@studenthub.com / admin123`, `teacher@studenthub.com / teacher123` and `rahul@studenthub.com / student123`.

If you don't seed, open the app and use **Create an account** to make the first admin. After the first admin exists, only a logged-in admin can create more admins.

### 4. Run

```bash
npm run dev
```

Or `npm run dev:local` to also start the built-in local database.

This starts the API on http://localhost:8004 and the frontend on http://localhost:5173. In development the frontend calls `/api/...` and Vite forwards it to the backend, so login cookies work without any CORS setup.

### Useful scripts (from the project root)

| Command | What it does |
|---------|--------------|
| `npm run dev` | backend (auto-restart) + frontend together |
| `npm run dev:local` | same, plus a local MongoDB (data saved in `backend/.local-db`) |
| `npm run admin --prefix backend -- list` | list admin accounts in the database from `MONGO_URI` |
| `npm run admin --prefix backend -- create` | create an admin (safe on a live database, deletes nothing) |
| `npm run admin --prefix backend -- reset-password` | set a new password for an admin who forgot theirs |
| `npm test` | runs the backend API tests against a throwaway in-memory MongoDB |
| `npm run build` | production build of the frontend |
| `npm run seed -- --yes` | resets the database with demo data |

---

## ☁️ Deployment

**Backend (e.g. Render):** root directory `backend`, start command `npm start`, environment variables:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a new random secret (at least 32 characters) |
| `NODE_ENV` | `production` – required so the login cookie works across sites |
| `CLIENT_URLS` | your Netlify URL, e.g. `https://student-managment-system-by-pushpak.netlify.app` |

**Frontend (Netlify):** base directory `frontend`, build command `npm run build`, publish directory `frontend/dist`, and set `VITE_API_URL` to the backend URL. `public/_redirects` makes page refreshes on routes like `/admin/dashboard` work.

---

## 🔌 API Overview

| Method | Path | Who |
|--------|------|-----|
| POST | `/logininfo` | anyone (rate limited) |
| POST | `/logout` | anyone |
| GET | `/check-auth`, `/me` | logged in |
| PATCH | `/me/password` | logged in (rate limited) |
| PATCH | `/me/photo` | logged in – your own profile photo |
| GET | `/me/notifications` | logged in |
| POST | `/demo-login` | anyone, only when `DEMO_MODE=true` |
| GET | `/setup-status` | anyone – tells the UI whether first-admin sign-up is open |
| POST | `/admins` | anyone while no admin exists, then admins only (can create teachers) |
| GET | `/staff` | admin |
| GET | `/students` | staff (teachers see their courses' students) |
| POST | `/students` | admin |
| PATCH | `/students/:email` | admin |
| DELETE | `/students/:id` | admin |
| GET | `/students/email/:email` | admin, or that student |
| GET | `/courses`, `/assignments`, `/assignments/course/:courseId` | logged in (each role sees only its own courses) |
| POST / DELETE | `/courses`, `/courses/:CourseId` | admin |
| PUT | `/courses/:CourseId/teachers`, `/courses/:CourseId/schedule` | admin |
| POST | `/enrollcourse` | admin |
| PATCH | `/enrollmultiplecourses`, `/enrollmultiplestudents` | admin |
| DELETE | `/courses/:CourseId/students/:StudentId` | admin |
| GET / POST | `/courses/:CourseId/sessions` | staff – attendance by day |
| PATCH / DELETE | `/sessions/:id` | staff |
| POST | `/courses/:CourseId/checkin` | staff – opens today's QR check-in |
| GET | `/sessions/:id/checkin` | staff – current code and who has checked in |
| POST | `/sessions/:id/finish` | staff – closes check-in, marks the rest absent |
| POST | `/checkin` | student (rate limited) – `{ token }` from the QR code |
| GET | `/me/attendance` | student – own day-by-day history |
| GET / POST | `/courses/:CourseId/assessments` | staff – gradebook |
| PATCH / DELETE | `/assessments/:id` | staff |
| PUT | `/assessments/:id/scores` | staff |
| GET | `/me/grades` | student – own scores, grades and GPA |
| POST / PATCH / DELETE | `/assignments`, `/assignments/:id` | staff |
| GET / PUT | `/assignments/:id/submission` | student – own hand-in |
| GET | `/me/submissions` | student – all own hand-ins |
| GET | `/assignments/:id/submissions` | staff – everyone in the course, with their hand-in |
| PATCH | `/submissions/:id/grade` | staff – `{ score, feedback }` |
| GET | `/submissions/:id/file` | the student who handed it in, or staff |
| GET | `/announcements` | logged in (students see everyone's + their courses') |
| POST / PATCH / DELETE | `/announcements`, `/announcements/:id` | staff |
| GET | `/insights/at-risk`, `/stats/overview` | staff – dashboard insights and charts |
| GET | `/students/:id/report` | staff – a student's report card |
| GET | `/me/report` | student – own report card |

"Staff" means admins and teachers; teachers are limited to the courses they're assigned.

Errors are always JSON: `{ "msg": "..." }`. State-changing requests from origins not listed in `CLIENT_URLS` are rejected with 403, and request bodies must be JSON.

---

## 🔑 Key Learnings

* Implemented secure authentication using JWT in httpOnly cookies
* Built RESTful APIs with Express.js, with server-side role checks
* Managed global state efficiently using Zustand
* Designed a layered backend (routes → controllers → models) with central error handling
* Protected cookie-based auth against CSRF and stale sessions
* Built a responsive, accessible UI with route guards, code splitting and loading/error states
* Wrote automated API tests and a CI pipeline

---

## 🚧 Future Improvements

* Real-time updates (WebSockets)
* Email or push notifications
* Parent accounts

---

## 📌 Author

Pushpak Bhagat
GitHub: https://github.com/griffithhhhhh
LinkedIn: https://linkedin.com/in/pushpak-bhagat

---

## 📜 License

This project is for educational purposes.
