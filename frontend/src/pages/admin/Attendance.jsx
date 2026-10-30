import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { BookOpen, CalendarCheck, Check, CheckCheck, X } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import { Badge, ProgressBar } from "../../components/ui/Feedback";
import { Input } from "../../components/ui/Form";
import { Reveal, Stagger } from "../../components/ui/Motion";
import useAdminStore from "../../store/useAdminStore";
import { attendanceTone, fullName, idOf, percent } from "../../lib/format";
import { toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

export default function Attendance() {
  const courses = useAdminStore((s) => s.courses);
  const students = useAdminStore((s) => s.students);
  const upsertStudent = useAdminStore((s) => s.upsertStudent);

  const [courseId, setCourseId] = useState(() => courses[0]?._id ?? null);
  const [marked, setMarked] = useState({});   // studentId -> "present" | "absent"
  const [marks, setMarks] = useState({});     // studentId -> string from the input
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingMarksFor, setSavingMarksFor] = useState(null);

  const roster = useMemo(
    () => students
      .map((s) => ({ student: s, enrollment: s.courses?.find((e) => idOf(e.course) === courseId) }))
      .filter((row) => row.enrollment),
    [students, courseId]
  );

  const markedCount = roster.filter(({ student }) => marked[student._id]).length;
  const presentCount = roster.filter(({ student }) => marked[student._id] === "present").length;
  const activeTone = toneFor(courseId);

  const selectCourse = (id) => {
    setCourseId(id);
    setMarked({});
    setMarks({});
  };

  const markEveryone = (value) =>
    setMarked(Object.fromEntries(roster.map(({ student }) => [student._id, value])));

  const toggle = (sid, value) => setMarked((m) => ({ ...m, [sid]: m[sid] === value ? undefined : value }));

  // Records one class for every student that has been marked present or absent
  const saveAttendance = async () => {
    const entries = Object.entries(marked).filter(([sid, v]) => v && roster.some((r) => r.student._id === sid));
    setSavingAttendance(true);
    const results = await Promise.allSettled(
      entries.map(([sid, value]) =>
        api.patch("/courses/attendance", { CourseId: courseId, StudentId: sid, ifPresent: value === "present" })
      )
    );
    results.forEach((r) => r.status === "fulfilled" && upsertStudent(r.value.data.student));

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      toast.error(`${failed.length} record(s) couldn't be saved: ${getErrorMessage(failed[0].reason)}`);
    } else {
      toast.success(`Attendance saved for ${entries.length} student${entries.length === 1 ? "" : "s"} 🎉`);
      setMarked({});
    }
    setSavingAttendance(false);
  };

  const saveMarks = async (sid) => {
    setSavingMarksFor(sid);
    try {
      const { data } = await api.patch("/courses/marks", { CourseId: courseId, StudentId: sid, Marks: marks[sid] });
      upsertStudent(data.Student);
      setMarks((m) => ({ ...m, [sid]: undefined }));
      toast.success("Marks saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingMarksFor(null);
    }
  };

  if (courses.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Manage" title="Attendance & Marks" />
        <Card>
          <EmptyState icon={BookOpen} title="No courses yet" message="Create a course and enroll students first."
            action={<Link to="/admin/courses" className="font-semibold text-violet-600">Go to courses</Link>} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Manage" title="Attendance & Marks" description="Pick a course, mark who attended this class, then save." />

      {/* Course picker: scrolls sideways on small screens */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 mb-5" role="tablist" aria-label="Courses" data-lenis-prevent>
        <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
          {courses.map((c) => {
            const active = courseId === c._id;
            const tone = toneFor(c._id);
            return (
              <button
                key={c._id}
                role="tab"
                aria-selected={active}
                onClick={() => selectCourse(c._id)}
                className={cn(
                  "relative h-11 px-5 rounded-2xl text-[14px] font-semibold whitespace-nowrap transition-colors",
                  active ? "text-white" : "bg-white text-ink-soft border border-line hover:border-violet-200 shadow-soft"
                )}
              >
                {active && (
                  <motion.span layoutId="course-tab" className={cn("absolute inset-0 rounded-2xl bg-linear-to-r shadow-soft", tone.gradient)}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative flex items-center gap-2">
                  {!active && <span className={cn("w-2.5 h-2.5 rounded-full bg-linear-to-br", tone.gradient)} />}
                  {c.courseName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {roster.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="No students in this course" message="Enroll students from the Courses page."
            action={<Link to="/admin/courses" className="font-semibold text-violet-600">Manage courses</Link>} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <p className="text-[14px] font-semibold text-ink-soft mr-auto">
              {roster.length} student{roster.length === 1 ? "" : "s"} in <span className={activeTone.text}>{courses.find((c) => c._id === courseId)?.courseName}</span>
            </p>
            <Button variant="secondary" size="sm" onClick={() => markEveryone("present")}>
              <CheckCheck size={15} className="text-emerald-500" aria-hidden="true" /> All present
            </Button>
            <Button variant="secondary" size="sm" onClick={() => markEveryone("absent")}>
              <X size={15} className="text-rose-500" aria-hidden="true" /> All absent
            </Button>
          </div>

          <Stagger as="ul" className="flex flex-col gap-3 pb-32" key={courseId}>
            {roster.map(({ student, enrollment }) => {
              const pct = percent(enrollment.attendedClasses, enrollment.totalClasses);
              const state = marked[student._id];
              const draftMarks = marks[student._id];
              return (
                <Reveal as="li" key={student._id}>
                  <Card className={cn(
                    "p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all duration-300",
                    state === "present" && "ring-2 ring-emerald-300 bg-emerald-50/40",
                    state === "absent" && "ring-2 ring-rose-300 bg-rose-50/40"
                  )}>
                    <div className="flex items-center gap-3 md:w-64 min-w-0">
                      <Avatar person={student} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-ink truncate">{fullName(student)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <ProgressBar value={pct} tone={enrollment.totalClasses ? attendanceTone(pct) : "violet"} className="w-20 h-1.5" label={`${fullName(student)} attendance`} />
                          <span className="text-[12px] font-semibold text-muted tabular-nums">
                            {enrollment.attendedClasses}/{enrollment.totalClasses}
                          </span>
                          {enrollment.totalClasses > 0 && <Badge tone={attendanceTone(pct)} className="py-0.5">{pct}%</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:flex md:ml-auto" role="group" aria-label={`Attendance for ${fullName(student)}`}>
                      <AttendanceToggle label="Present" icon={Check} active={state === "present"} tone="good" onClick={() => toggle(student._id, "present")} />
                      <AttendanceToggle label="Absent" icon={X} active={state === "absent"} tone="bad" onClick={() => toggle(student._id, "absent")} />
                    </div>

                    <form className="flex gap-2 md:w-60" onSubmit={(e) => { e.preventDefault(); saveMarks(student._id); }}>
                      <label htmlFor={`marks-${student._id}`} className="sr-only">Marks for {fullName(student)}</label>
                      <Input
                        id={`marks-${student._id}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder={`Marks · ${enrollment.marks}`}
                        value={draftMarks ?? ""}
                        onChange={(e) => setMarks((m) => ({ ...m, [student._id]: e.target.value }))}
                        className="h-11 py-0"
                      />
                      <Button type="submit" variant="secondary" loading={savingMarksFor === student._id} disabled={draftMarks === undefined || draftMarks === ""}>
                        Save
                      </Button>
                    </form>
                  </Card>
                </Reveal>
              );
            })}
          </Stagger>

          {/* Floating save bar, always within thumb reach */}
          <motion.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.3 }}
            className="fixed z-20 bottom-4 inset-x-4 lg:left-[304px] lg:right-8 pb-[env(safe-area-inset-bottom)]"
          >
            <div className="max-w-[1336px] mx-auto glass shadow-lift rounded-3xl px-4 sm:px-6 py-3.5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-ink">
                  {markedCount ? `${markedCount} of ${roster.length} marked` : "Mark students to record a class"}
                </p>
                {markedCount > 0 && (
                  <p className="text-[12px] text-muted">
                    <span className="text-emerald-600 font-semibold">{presentCount} present</span> ·{" "}
                    <span className="text-rose-500 font-semibold">{markedCount - presentCount} absent</span>
                  </p>
                )}
              </div>
              <Button onClick={saveAttendance} loading={savingAttendance} disabled={!markedCount}>
                <CalendarCheck size={17} aria-hidden="true" /> Save attendance
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}

function AttendanceToggle({ label, icon: Icon, active, tone, onClick }) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-semibold transition-all duration-200",
        active && tone === "good" && "bg-linear-to-r from-emerald-400 to-teal-500 text-white shadow-[0_8px_20px_-6px_rgb(16_185_129/0.55)]",
        active && tone === "bad" && "bg-linear-to-r from-rose-400 to-pink-500 text-white shadow-[0_8px_20px_-6px_rgb(244_63_94/0.55)]",
        !active && "bg-white text-ink-soft border border-line hover:border-violet-200"
      )}
    >
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </motion.button>
  );
}
