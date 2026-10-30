import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle, ArrowUpRight, BookOpen, CalendarCheck, CalendarClock, ClipboardList, Megaphone, PartyPopper, Trophy } from "lucide-react";
import { Card, CardHeader, EmptyState, StatCard } from "../../components/ui/Card";
import { Badge, Ring } from "../../components/ui/Feedback";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import Hero from "../../components/ui/Hero";
import AnnouncementCard from "../../components/AnnouncementCard";
import usePortalStore from "../../store/usePortalStore";
import { useFetch } from "../../lib/useFetch";
import { ATTENDANCE_TARGET, attendanceOf, attendanceTone, classesNeeded, daysUntil, dueLabel, greeting, idOf, percent } from "../../lib/format";
import { STATUS, toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";
import { classState, classesByDay, formatTime } from "../../lib/timetable";

const linkClass = "inline-flex items-center gap-1 text-[13px] font-semibold text-violet-600 hover:text-fuchsia-600 transition-colors";

export default function StudentDashboard() {
  const profile = usePortalStore((s) => s.profile);
  const assignments = usePortalStore((s) => s.assignments);

  const enrollments = profile.courses || [];
  const overall = attendanceOf(enrollments);
  const upcoming = assignments.filter((a) => a.dueDate && daysUntil(a.dueDate) >= 0);
  const overdue = assignments.filter((a) => a.dueDate && daysUntil(a.dueDate) < 0);
  const lowCourses = enrollments.filter((e) => e.totalClasses > 0 && percent(e.attendedClasses, e.totalClasses) < ATTENDANCE_TARGET);
  const grades = useFetch("/me/grades");
  const news = useFetch("/announcements");
  const gpa = grades.data?.gpa ?? null;
  const graded = grades.data?.courses.filter((c) => c.grade).length ?? 0;

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
          <Link to="/student/grades" className="block h-full rounded-3xl">
            <StatCard label="GPA" value={gpa ?? "—"} sub={gpa === null ? "no grades yet" : `across ${graded} graded course${graded === 1 ? "" : "s"}`} icon={Trophy} tone="sky" />
          </Link>
        </Reveal>
      </Stagger>

      <TodaysClasses />

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

      {news.data?.announcements.length > 0 && (
        <InView className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink"><Megaphone size={18} className="text-violet-500" aria-hidden="true" /> Latest news</h2>
            <Link to="/student/announcements" className={linkClass}>All <ArrowUpRight size={15} /></Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {news.data.announcements.slice(0, 2).map((a) => <AnnouncementCard key={a._id} announcement={a} compact />)}
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
                        <p className={cn("text-[12px] font-bold mt-0.5", tone.text)}>
                          {(() => {
                            const g = grades.data?.courses.find((c) => idOf(c.course) === idOf(e.course))?.grade;
                            return g ? `Grade ${g.letter} · ${g.percent}%` : "Not graded yet";
                          })()}
                        </p>
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
                      <span className={cn("relative z-10 mt-1 w-3 h-3 rounded-full ring-4 ring-surface bg-linear-to-br flex-shrink-0", tone.gradient)} />
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

// A strip of today's classes from the timetable (hidden on days without any)
function TodaysClasses() {
  const { data } = useFetch("/courses");
  const now = new Date();
  const today = data ? classesByDay(data.Courses)[now.getDay()] : [];
  if (today.length === 0) return null;

  return (
    <InView className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink"><CalendarClock size={18} className="text-violet-500" aria-hidden="true" /> Today's classes</h2>
        <Link to="/student/timetable" className={linkClass}>Week <ArrowUpRight size={15} /></Link>
      </div>
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-1" data-lenis-prevent>
        <ul className="flex gap-3 w-max">
          {today.map(({ course, slot }) => {
            const state = classState(slot, now);
            const tone = toneFor(course._id);
            return (
              <li key={`${course._id}-${slot.start}`}
                className={cn("relative overflow-hidden w-56 rounded-3xl bg-surface border border-line p-4 pl-5 shadow-soft", state === "done" && "opacity-55")}>
                <span className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b", tone.gradient)} aria-hidden="true" />
                <p className="text-[12px] font-semibold text-muted tabular-nums">{formatTime(slot.start)} – {formatTime(slot.end)}</p>
                <p className="text-[16px] font-bold text-ink truncate">{course.courseName}</p>
                <p className="text-[12px] text-ink-soft mt-0.5">
                  {slot.room || "Room TBA"}
                  {state === "now" && <Badge tone="good" className="ml-2">Now</Badge>}
                  {state === "done" && <span className="ml-2 text-muted">· done</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </InView>
  );
}
