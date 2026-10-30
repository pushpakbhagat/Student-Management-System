import { useEffect } from "react";
import { BookOpen, CalendarCheck, ClipboardList, Info, LayoutDashboard, Settings, Users } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { ErrorState, FullPageLoader } from "../../components/ui/Feedback";
import useAdminStore from "../../store/useAdminStore";
import { TONES } from "../../lib/palette";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: TONES.violet.chip },
  { to: "/admin/students", label: "Students", icon: Users, tone: TONES.sky.chip },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, tone: TONES.teal.chip },
  { to: "/admin/attendance", label: "Attendance & Marks", icon: CalendarCheck, tone: TONES.coral.chip },
  { to: "/admin/assignments", label: "Assignments", icon: ClipboardList, tone: TONES.amber.chip },
  { to: "/admin/account", label: "Settings", icon: Settings, tone: TONES.pink.chip },
  { to: "/admin/about", label: "About", icon: Info, tone: "bg-slate-100 text-slate-500" },
];

export default function AdminLayout() {
  const status = useAdminStore((s) => s.status);
  const load = useAdminStore((s) => s.load);

  // After a page refresh the store is empty, so fetch everything once
  useEffect(() => {
    if (status === "idle") load().catch(() => {});
  }, [status, load]);

  if (status === "idle" || status === "loading") return <FullPageLoader />;
  if (status === "error") {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <ErrorState message="We couldn't load your data." onRetry={() => load().catch(() => {})} />
      </div>
    );
  }

  return <AppShell nav={NAV} portalName="Admin" />;
}
