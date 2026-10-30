import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle, ArrowUpRight, BookOpen, CalendarCheck, ClipboardList, PartyPopper, Trophy } from "lucide-react";
import { Card, CardHeader, EmptyState, StatCard } from "../../components/ui/Card";
import { Badge, Ring } from "../../components/ui/Feedback";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import Hero from "../../components/ui/Hero";
import usePortalStore from "../../store/usePortalStore";
import { ATTENDANCE_TARGET, attendanceOf, attendanceTone, classesNeeded, daysUntil, dueLabel, greeting, idOf, percent } from "../../lib/format";
import { STATUS, toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

const linkClass = "inline-flex items-center gap-1 text-[13px] font-semibold text-violet-600 hover:text-fuchsia-600 transition-colors";

export default function StudentDashboard() {
  const profile = usePortalStore((s) => s.profile);
  const assignments = usePortalStore((s) => s.assignments);

  const enrollments = profile.courses || [];
  const overall = attendanceOf(enrollments);
  const upcoming = assignments.filter((a) => a.dueDate && daysUntil(a.dueDate) >= 0);
  const overdue = assignments.filter((a) => a.dueDate && daysUntil(a.dueDate) < 0);
  const lowCourses = enrollments.filter((e) => e.totalClasses > 0 && percent(e.attendedClasses, e.totalClasses) < ATTENDANCE_TARGET);
  const best = [...enrollments].sort((a, b) => (b.marks || 0) - (a.marks || 0))[0];

  return (
    <>
      <Hero
        eyebrow="Student portal"
        title={<>{greeting()}, {profile.firstName} <motion.span className="inline-block origin-[70%_70%]" animate={{ rotate: [0, 18, -8, 18, 0] }} transition={{ duration: 1.4, delay: 0.6 }}>👋</motion.span></>}
        illustration={
          <div className="rounded-[28px] bg-white/15 ring-1 ring-white/25 backdrop-blur p-5 text-center">
            <Ring value={overall.pct} size={132} stroke={12} color="#ffffff" colorTo="#fde68a" label="Your attendance">
              <span className="font-display text-[30px] font-bold leading-none">{overall.total ? `${overall.pct}%` : "—"}</span>
              <span className="text-[11px] text-white/80 mt-1">attendance</span>
            </Ring>
          </div>
        }
      >
        {upcoming.length
          ? `You have ${upcoming.length} assignment${upcoming.length === 1 ? "" : "s"} coming up`
          : "No assignments due — you're all caught up"}
        {lowCourses.length ? `, and ${lowCourses.length} course${lowCourses.length === 1 ? " needs" : "s need"} better attendance.` : ". Keep it up!"}
      </Hero>

      <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 mb-6">
        <Reveal><StatCard label="Courses" value={enrollments.length} sub="enrolled" icon={BookOpen} tone="violet" /></Reveal>
        <Reveal>
          <StatCard label="Attendance" value={overall.total ? overall.pct : "—"} suffix="%"
            sub={overall.total ? `${overall.attended} of ${overall.total} classes` : "no classes yet"}
            icon={CalendarCheck} tone={overall.total ? attendanceTone(overall.pct) : "coral"} />
        </Reveal>
        <Reveal>
          <StatCard label="Due soon" value={upcoming.length} sub={overdue.length ? `${overdue.length} past due` : "nothing overdue"}
            icon={ClipboardList} tone={overdue.length ? "bad" : "amber"} />
        </Reveal>
        <Reveal>
          <StatCard label="Top marks" value={best?.marks ?? "—"} sub={best?.course?.courseName ?? "no marks yet"} icon={Trophy} tone="sky" />
        </Reveal>
      </Stagger>

      {lowCourses.length > 0 && (
        <InView>
          <div role="alert" className="flex gap-4 rounded-3xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/70 p-5 mb-6 shadow-soft">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <div className="text-[14px]">
              <p className="font-display text-[16px] font-bold text-amber-900">Attendance below {ATTENDANCE_TARGET}%</p>
              <ul className="text-amber-800 mt-1 space-y-0.5">
                {lowCourses.map((e) => (
                  <li key={e._id}>
                    <span className="font-semibold">{e.course?.courseName ?? "Course"}</span> — attend the next {classesNeeded(e.attendedClasses, e.totalClasses)} classes to catch up
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </InView>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <InView className="xl:col-span-3">
          <Card className="h-full">
            <CardHeader title="My courses" icon={BookOpen} action={<Link to="/student/attendance" className={linkClass}>Details <ArrowUpRight size={15} /></Link>} />
            {enrollments.length === 0 ? (
              <EmptyState icon={BookOpen} title="Not enrolled yet" message="Your admin will add you to courses." />
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 sm:px-6 pb-6 pt-1">
                {enrollments.map((e) => {
                  const pct = percent(e.attendedClasses, e.totalClasses);
                  const tone = toneFor(idOf(e.course));
                  const status = e.totalClasses ? attendanceTone(pct) : null;
                  return (
                    <li key={e._id} className="relative overflow-hidden rounded-3xl border border-line p-4 flex items-center gap-4 hover:shadow-soft transition-shadow">
                      <span className={cn("absolute inset-x-0 top-0 h-1 bg-linear-to-r", tone.gradient)} aria-hidden="true" />
                      <Ring value={pct} size={64} stroke={7} color={status ? STATUS[status].hex : tone.hex} label={`${e.course?.courseName} attendance`}>
                        <span className="text-[13px] font-bold text-ink">{e.totalClasses ? `${pct}%` : "—"}</span>
                      </Ring>
                      <div className="min-w-0">
                        <p className="font-display text-[16px] font-bold text-ink truncate">{e.course?.courseName ?? "Course"}</p>
                        <p className="text-[12px] text-muted">{e.attendedClasses}/{e.totalClasses} classes</p>
                        <p className={cn("text-[12px] font-bold mt-0.5", tone.text)}>Marks: {e.marks}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </InView>

        <InView className="xl:col-span-2" delay={0.1}>
          <Card className="h-full">
            <CardHeader title="Coming up" icon={ClipboardList} action={<Link to="/student/assignments" className={linkClass}>All <ArrowUpRight size={15} /></Link>} />
            {upcoming.length === 0 ? (
              <EmptyState icon={PartyPopper} title="All caught up" message="No upcoming assignments." />
            ) : (
              <ol className="px-6 pb-5 relative">
                <span className="absolute left-[31px] top-2 bottom-7 w-px bg-line" aria-hidden="true" />
                {upcoming.slice(0, 5).map((a) => {
                  const tone = toneFor(idOf(a.course));
                  return (
                    <li key={a._id} className="relative flex gap-4 py-2.5">
                      <span className={cn("relative z-10 mt-1 w-3 h-3 rounded-full ring-4 ring-white bg-linear-to-br flex-shrink-0", tone.gradient)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ink truncate">{a.title}</p>
                        <p className={cn("text-[12px] font-semibold", tone.text)}>{a.course?.courseName}</p>
                      </div>
                      <Badge tone={daysUntil(a.dueDate) <= 3 ? "bad" : "neutral"}>{dueLabel(a.dueDate)}</Badge>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </InView>
      </div>
    </>
  );
}
