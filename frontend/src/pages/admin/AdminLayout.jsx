import { useEffect, useMemo } from "react";
import { BookOpen, CalendarCheck, CalendarClock, ClipboardList, GraduationCap, Info, LayoutDashboard, Megaphone, Settings, Users } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import useAdminStore from "../../store/useAdminStore";
import useSessionStore from "../../store/useSessionStore";
import { TONES } from "../../lib/palette";

// adminOnly items are hidden from teachers (the server refuses those actions anyway)
const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: TONES.violet.chip },
  { to: "/admin/students", label: "Students", icon: Users, tone: TONES.sky.chip },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, tone: TONES.teal.chip, adminOnly: true },
  { to: "/admin/timetable", label: "Timetable", icon: CalendarClock, tone: TONES.sky.chip },
  { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck, tone: TONES.coral.chip },
  { to: "/admin/grades", label: "Grades", icon: GraduationCap, tone: TONES.violet.chip },
  { to: "/admin/assignments", label: "Assignments", icon: ClipboardList, tone: TONES.amber.chip },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone, tone: TONES.coral.chip },
  { to: "/admin/account", label: "Settings", icon: Settings, tone: TONES.pink.chip },
  { to: "/admin/about", label: "About", icon: Info, tone: "bg-slate-100 text-slate-500" },
];

export default function AdminLayout() {
  const status = useAdminStore((s) => s.status);
  const load = useAdminStore((s) => s.load);
  const role = useSessionStore((s) => s.role);
  const nav = useMemo(() => NAV.filter((item) => role === "admin" || !item.adminOnly), [role]);

  // After a page refresh the store is empty, so fetch everything once (the shell shows a skeleton meanwhile)
  useEffect(() => {
    if (status === "idle") load().catch(() => {});
  }, [status, load]);

  return (
    <AppShell
      nav={nav}
      portalName={role === "teacher" ? "Teacher" : "Admin"}
      status={status}
      onRetry={() => load().catch(() => {})}
    />
  );
}
