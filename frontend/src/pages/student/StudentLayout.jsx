import { useEffect } from "react";
import { CalendarCheck, ClipboardList, LayoutDashboard, Settings } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { ErrorState, FullPageLoader } from "../../components/ui/Feedback";
import usePortalStore from "../../store/usePortalStore";
import { TONES } from "../../lib/palette";

const NAV = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: TONES.violet.chip },
  { to: "/student/attendance", label: "Attendance & Marks", icon: CalendarCheck, tone: TONES.coral.chip },
  { to: "/student/assignments", label: "Assignments", icon: ClipboardList, tone: TONES.amber.chip },
  { to: "/student/settings", label: "Settings", icon: Settings, tone: TONES.pink.chip },
];

export default function StudentLayout() {
  const status = usePortalStore((s) => s.status);
  const load = usePortalStore((s) => s.load);

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

  return <AppShell nav={NAV} portalName="Student portal" />;
}
