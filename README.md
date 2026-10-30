# 🎓 Student Management System (Student Hub)

A full-stack web application built using the MERN stack to manage student records, courses, attendance, marks and assignments, with role-based access for admins and students.

---

## 🚀 Features

* 🔐 **Security**
  * JWT in an httpOnly cookie with expiry; the account is re-checked on every request, so deleted users lose access immediately
  * Role-based access enforced by the server; students only ever see their own courses and assignments
  * CSRF protection (origin check, JSON-only bodies), login rate limiting, Helmet headers
  * bcrypt-hashed passwords that are never sent to the browser; changing a password signs out other devices

* 👨‍🎓 **Students** – searchable directory, add/edit with course enrollment, delete with confirmation
* 📚 **Courses** – create/delete courses and manage each course's roster
* ✅ **Attendance & marks** – mark a whole class at once, record marks per course
* 📝 **Assignments** – per-course assignments with due dates and a due-date calendar
* 📊 **Dashboards** for admins (stats, low-attendance alerts, enrollment) and students (attendance, marks, deadlines)
* 📱 **Mobile-friendly** – responsive layouts with a slide-out menu on phones and tablets
* ⚙️ **Account settings** – change your password; admins can add other admins

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
  services/auth.js  JWT + cookie + password helpers
  seed.js           fills a database with demo data
  test/             API tests
frontend/
  src/pages/        route pages (admin/, student/, login, register)
  src/components/   app shell, route guards and reusable UI (ui/)
  src/store/        Zustand stores: session, admin data, student portal data
  src/lib/          formatting and helper functions
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

Demo logins: `admin@studenthub.com / admin123` and `rahul@studenthub.com / student123`.

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
| GET | `/setup-status` | anyone – tells the UI whether first-admin sign-up is open |
| POST | `/admins` | anyone while no admin exists, then admins only |
| GET / POST | `/students` | admin |
| PATCH | `/students/:email` | admin |
| DELETE | `/students/:id` | admin |
| GET | `/students/email/:email` | admin, or that student |
| GET | `/courses`, `/assignments`, `/assignments/course/:courseId` | logged in (students get only their own courses) |
| POST / DELETE | `/courses`, `/courses/:CourseId` | admin |
| PATCH | `/courses/attendance`, `/courses/marks` | admin |
| POST | `/enrollcourse` | admin |
| PATCH | `/enrollmultiplecourses`, `/enrollmultiplestudents` | admin |
| DELETE | `/courses/:CourseId/students/:StudentId` | admin |
| POST / PATCH / DELETE | `/assignments`, `/assignments/:id` | admin |

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
* Analytics dashboard (charts, insights)
* File upload support (assignments, documents)

---

## 📌 Author

Pushpak Bhagat
GitHub: https://github.com/griffithhhhhh
LinkedIn: https://linkedin.com/in/pushpak-bhagat

---

## 📜 License

This project is for educational purposes.
