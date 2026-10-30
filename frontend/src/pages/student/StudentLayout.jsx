import { useEffect } from "react";
import { CalendarCheck, CalendarClock, ClipboardList, FileText, GraduationCap, LayoutDashboard, Megaphone, Settings } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import usePortalStore from "../../store/usePortalStore";
import { TONES } from "../../lib/palette";

const NAV = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: TONES.violet.chip },
  { to: "/student/timetable", label: "Timetable", icon: CalendarClock, tone: TONES.sky.chip },
  { to: "/student/attendance", label: "Attendance", icon: CalendarCheck, tone: TONES.coral.chip },
  { to: "/student/grades", label: "Grades", icon: GraduationCap, tone: TONES.sky.chip },
  { to: "/student/assignments", label: "Assignments", icon: ClipboardList, tone: TONES.amber.chip },
  { to: "/student/announcements", label: "Announcements", icon: Megaphone, tone: TONES.teal.chip },
  { to: "/student/report", label: "Report card", icon: FileText, tone: TONES.violet.chip },
  { to: "/student/settings", label: "Settings", icon: Settings, tone: TONES.pink.chip },
];

export default function StudentLayout() {
  const status = usePortalStore((s) => s.status);
  const load = usePortalStore((s) => s.load);

  useEffect(() => {
    if (status === "idle") load().catch(() => {});
  }, [status, load]);

  return <AppShell nav={NAV} portalName="Student portal" status={status} onRetry={() => load().catch(() => {})} />;
}
