import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { GuestOnly, RequireRole } from "./components/RouteGuards";
import { FullPageLoader } from "./components/ui/Feedback";
import useSessionStore from "./store/useSessionStore";
import { startSmoothScroll } from "./lib/smoothScroll";
import Login from "./pages/Login";

// Each area is its own bundle, so students never download admin code (and vice versa)
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const StudentsPage = lazy(() => import("./pages/admin/students/StudentsPage"));
const StudentFormPage = lazy(() => import("./pages/admin/students/StudentFormPage"));
const Courses = lazy(() => import("./pages/admin/Courses"));
const Attendance = lazy(() => import("./pages/admin/Attendance"));
const AdminAssignments = lazy(() => import("./pages/admin/Assignments"));
const Grades = lazy(() => import("./pages/admin/Grades"));
const Announcements = lazy(() => import("./pages/admin/Announcements"));
const About = lazy(() => import("./pages/admin/About"));
const Account = lazy(() => import("./pages/admin/Account"));

const StudentLayout = lazy(() => import("./pages/student/StudentLayout"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentAttendance = lazy(() => import("./pages/student/StudentAttendance"));
const StudentAssignments = lazy(() => import("./pages/student/StudentAssignments"));
const StudentSettings = lazy(() => import("./pages/student/StudentSettings"));
const StudentGrades = lazy(() => import("./pages/student/StudentGrades"));
const StudentAnnouncements = lazy(() => import("./pages/student/StudentAnnouncements"));

export default function App() {
  const restore = useSessionStore((s) => s.restore);

  // Ask the server who we are (the login cookie is httpOnly, so JS can't read it)
  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => startSmoothScroll(), []);

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

        <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/new" element={<StudentFormPage />} />
          <Route path="students/:id/edit" element={<StudentFormPage />} />
          <Route path="courses" element={<Courses />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="grades" element={<Grades />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="account" element={<Account />} />
          <Route path="about" element={<About />} />
        </Route>

        <Route path="/student" element={<RequireRole role="student"><StudentLayout /></RequireRole>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="grades" element={<StudentGrades />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
