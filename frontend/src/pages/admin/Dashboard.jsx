import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { motion } from "motion/react";
import { ArrowUpRight, BookOpen, CalendarCheck, ClipboardList, PartyPopper, TrendingUp, UserPlus, Users } from "lucide-react";
import { Card, CardHeader, EmptyState, StatCard } from "../../components/ui/Card";
import { Badge, ProgressBar, Ring } from "../../components/ui/Feedback";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import Avatar from "../../components/ui/Avatar";
import Hero from "../../components/ui/Hero";
import useAdminStore from "../../store/useAdminStore";
import useSessionStore from "../../store/useSessionStore";
import { attendanceOf, attendanceTone, daysUntil, dueLabel, formatDate, fullName, greeting, idOf } from "../../lib/format";
import { STATUS, toneFor } from "../../lib/palette";
import { buttonClass } from "../../lib/buttonStyles";
import { cn } from "../../lib/cn";

const linkClass = "inline-flex items-center gap-1 text-[13px] font-semibold text-violet-600 hover:text-fuchsia-600 transition-colors";

export default function Dashboard() {
  const user = useSessionStore((s) => s.user);
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const assignments = useAdminStore((s) => s.assignments);
  const [selectedDay, setSelectedDay] = useState();

  const courseName = useMemo(() => new Map(courses.map((c) => [c._id, c.courseName])), [courses]);
  const overall = useMemo(() => attendanceOf(students.flatMap((s) => s.courses || [])), [students]);

  const upcoming = useMemo(
    () =>
      assignments
        .filter((a) => a.dueDate && daysUntil(a.dueDate) >= 0)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [assignments]
  );
  const dueThisWeek = upcoming.filter((a) => daysUntil(a.dueDate) <= 7).length;

  const withRates = useMemo(
    () => students.map((s) => {
      const att = attendanceOf(s.courses);
      return { ...s, rate: att.pct, hasClasses: att.total > 0 };
    }),
    [students]
  );
  const tracked = withRates.filter((s) => s.hasClasses);
  const atRisk = tracked.filter((s) => attendanceTone(s.rate) !== "good").sort((a, b) => a.rate - b.rate);

  const enrollment = useMemo(() => {
    const counts = courses.map((course) => ({
      ...course,
      enrolled: students.filter((s) => s.courses?.some((e) => idOf(e.course) === course._id)).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.enrolled));
    return counts.map((c) => ({ ...c, pct: Math.round((c.enrolled / max) * 100) }));
  }, [courses, students]);

  const dueDates = useMemo(() => assignments.filter((a) => a.dueDate).map((a) => new Date(a.dueDate)), [assignments]);
  const dueOnSelectedDay = selectedDay
    ? assignments.filter((a) => a.dueDate && new Date(a.dueDate).toDateString() === selectedDay.toDateString())
    : [];

  const overallTone = overall.total ? attendanceTone(overall.pct) : "neutral";

  return (
    <>
      <Hero
        eyebrow="Admin dashboard"
        title={<>{greeting()}, {user?.firstName ?? "there"} <motion.span className="inline-block origin-[70%_70%]" animate={{ rotate: [0, 18, -8, 18, 0] }} transition={{ duration: 1.4, delay: 0.6 }}>👋</motion.span></>}
        actions={
          <>
            <Link to="/admin/students/new" className={buttonClass({ variant: "secondary", className: "border-white/0 text-violet-700 hover:text-fuchsia-700" })}>
              <UserPlus size={17} aria-hidden="true" /> Add student
            </Link>
            <Link to="/admin/attendance" className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl font-semibold text-[14px] text-white bg-white/15 ring-1 ring-white/30 backdrop-blur hover:bg-white/25 transition-colors">
              <CalendarCheck size={17} aria-hidden="true" /> Take attendance
            </Link>
          </>
        }
        illustration={
          <div className="rounded-[28px] bg-white/15 ring-1 ring-white/25 backdrop-blur p-5 text-center">
            <Ring value={overall.pct} size={132} stroke={12} color="#ffffff" colorTo="#fde68a" label="Average attendance">
              <span className="font-display text-[30px] font-bold leading-none">{overall.total ? `${overall.pct}%` : "—"}</span>
              <span className="text-[11px] text-white/80 mt-1">attendance</span>
            </Ring>
          </div>
        }
      >
        {dueThisWeek > 0 ? `${dueThisWeek} assignment${dueThisWeek === 1 ? " is" : "s are"} due this week` : "No assignments due this week"}
        {" · "}
        {atRisk.length > 0 ? `${atRisk.length} student${atRisk.length === 1 ? " needs" : "s need"} attention` : "everyone's attendance is on track"}.
      </Hero>

      <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 mb-6">
        <Reveal><StatCard label="Students" value={students.length} sub="registered" icon={Users} tone="violet" /></Reveal>
        <Reveal><StatCard label="Courses" value={courses.length} sub="running" icon={BookOpen} tone="teal" /></Reveal>
        <Reveal><StatCard label="Assignments" value={assignments.length} sub={`${upcoming.length} upcoming`} icon={ClipboardList} tone="amber" /></Reveal>
        <Reveal>
          <StatCard
            label="Avg. attendance"
            value={overall.total ? overall.pct : "—"}
            suffix="%"
            sub={overall.total ? `${overall.attended} of ${overall.total} classes` : "no classes yet"}
            icon={TrendingUp}
            tone={overall.total ? overallTone : "coral"}
          />
        </Reveal>
      </Stagger>

      <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-3 gap-5 mb-5">
        <InView className="md:col-span-3 xl:col-span-2">
          <Card className="h-full">
            <CardHeader title="Enrollment by course" subtitle="How many students take each course" icon={BookOpen}
              action={<Link to="/admin/courses" className={linkClass}>Courses <ArrowUpRight size={15} /></Link>} />
            {enrollment.length === 0 ? (
              <EmptyState icon={BookOpen} title="No courses yet" className="py-10" />
            ) : (
              <ul className="px-5 sm:px-6 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-5">
                {enrollment.map((c) => {
                  const tone = toneFor(c._id);
                  return (
                    <li key={c._id}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={cn("w-2.5 h-2.5 rounded-full bg-linear-to-br flex-shrink-0", tone.gradient)} />
                          <span className="text-[14px] font-semibold text-ink truncate">{c.courseName}</span>
                        </span>
                        <span className="text-[13px] font-bold text-ink-soft tabular-nums">{c.enrolled}</span>
                      </div>
                      <ProgressBar value={c.pct} tone={tone.name} label={`${c.courseName} enrollment`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </InView>

        <InView delay={0.1} className="md:col-span-2 xl:col-span-1">
          <Card className="h-full flex flex-col items-center p-5">
            <p className="self-start font-display text-[16px] font-semibold text-ink">Due dates</p>
            <p className="self-start text-[12px] text-muted mb-1">Orange dots mark assignment deadlines</p>
            <div className="@container w-full flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                modifiers={{ due: dueDates }}
                modifiersClassNames={{ due: "rdp-due" }}
              />
            </div>
            <div className="self-stretch mt-1 text-[13px] text-muted min-h-5">
              {selectedDay &&
                (dueOnSelectedDay.length
                  ? dueOnSelectedDay.map((a) => <p key={a._id} className="font-medium text-ink truncate">• {a.title}</p>)
                  : `Nothing due on ${formatDate(selectedDay)}`)}
            </div>
          </Card>
        </InView>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <InView>
          <Card className="h-full overflow-hidden">
            <CardHeader title="Newest students" icon={Users} action={<Link to="/admin/students" className={linkClass}>All <ArrowUpRight size={15} /></Link>} />
            {students.length === 0 ? (
              <EmptyState icon={Users} title="No students yet" action={<Link to="/admin/students/new" className={linkClass}>Add your first student</Link>} />
            ) : (
              <ul className="px-3 pb-3">
                {withRates.slice(0, 5).map((s) => (
                  <li key={s._id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-violet-50/60 transition-colors">
                    <Avatar person={s} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink truncate">{fullName(s)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {(s.courses || []).slice(0, 4).map((e) => (
                          <span key={e._id ?? idOf(e.course)} title={courseName.get(idOf(e.course))}
                            className={cn("w-2 h-2 rounded-full bg-linear-to-br", toneFor(idOf(e.course)).gradient)} />
                        ))}
                        <span className="text-[12px] text-muted ml-1">{s.courses?.length || 0} courses</span>
                      </div>
                    </div>
                    {s.hasClasses ? <Badge tone={attendanceTone(s.rate)}>{s.rate}%</Badge> : <Badge>new</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </InView>

        <InView delay={0.08}>
          <Card className="h-full overflow-hidden">
            <CardHeader title="Coming up" icon={ClipboardList} action={<Link to="/admin/assignments" className={linkClass}>Manage <ArrowUpRight size={15} /></Link>} />
            {upcoming.length === 0 ? (
              <EmptyState icon={PartyPopper} title="Nothing due" message="Enjoy the quiet." className="py-10" />
            ) : (
              <ol className="px-6 pb-5 relative">
                <span className="absolute left-[31px] top-2 bottom-7 w-px bg-line" aria-hidden="true" />
                {upcoming.slice(0, 5).map((a) => {
                  const tone = toneFor(idOf(a.course));
                  return (
                    <li key={a._id} className="relative flex gap-4 py-2.5">
                      <span className={cn("relative z-10 mt-1 w-3 h-3 rounded-full ring-4 ring-white bg-linear-to-br flex-shrink-0", tone.gradient)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-ink truncate">{a.title}</p>
                        <p className={cn("text-[12px] font-semibold", tone.text)}>{courseName.get(idOf(a.course)) ?? "Course"}</p>
                      </div>
                      <Badge tone={daysUntil(a.dueDate) <= 3 ? "bad" : "neutral"}>{dueLabel(a.dueDate)}</Badge>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </InView>

        <InView delay={0.16} className="md:col-span-2 xl:col-span-1">
          <Card className="h-full overflow-hidden">
            <CardHeader title="Needs attention" subtitle="Attendance below 75%" icon={CalendarCheck}
              action={<Link to="/admin/attendance" className={linkClass}>Attendance <ArrowUpRight size={15} /></Link>} />
            {atRisk.length === 0 ? (
              <EmptyState icon={PartyPopper} title="Everyone is on track" message={tracked.length ? "No one is below 75%." : "Record some classes to see this."} className="py-10" />
            ) : (
              <ul className="px-6 pb-6 pt-1 flex flex-col gap-4">
                {atRisk.slice(0, 5).map((s) => (
                  <li key={s._id} className="flex items-center gap-3">
                    <Avatar person={s} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 mb-1.5">
                        <p className="text-[14px] font-semibold text-ink truncate">{fullName(s)}</p>
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: STATUS[attendanceTone(s.rate)].hex }}>{s.rate}%</span>
                      </div>
                      <ProgressBar value={s.rate} tone={attendanceTone(s.rate)} label={`${fullName(s)} attendance`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </InView>
      </div>
    </>
  );
}

