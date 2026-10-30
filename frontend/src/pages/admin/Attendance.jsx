import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { BookOpen, CalendarCheck, CheckCheck, ChevronLeft, ChevronRight, Download, History, Pencil, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { Card, CardHeader, EmptyState, PageHeader } from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Badge, ProgressBar, Spinner } from "../../components/ui/Feedback";
import { Input } from "../../components/ui/Form";
import { Reveal, Stagger } from "../../components/ui/Motion";
import CourseTabs from "../../components/CourseTabs";
import useAdminStore from "../../store/useAdminStore";
import { useFetch } from "../../lib/useFetch";
import { attendanceTone, formatDay, fullName, idOf, percent, shiftDay, toDateInput, todayInput } from "../../lib/format";
import { dateStamp, downloadCsv } from "../../lib/csv";
import { cn } from "../../lib/cn";
import { STATUS_OPTIONS } from "../../lib/attendance";

export default function Attendance() {
  const courses = useAdminStore((s) => s.courses);
  const [courseId, setCourseId] = useState(() => courses[0]?._id ?? null);
  const [day, setDay] = useState(todayInput);
  const sessions = useFetch(courseId ? `/courses/${courseId}/sessions` : null);

  if (courses.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Manage" title="Attendance" />
        <Card>
          <EmptyState icon={BookOpen} title="No courses yet" message="Create a course and enroll students first."
            action={<Link to="/admin/courses" className="font-semibold text-violet-600">Go to courses</Link>} />
        </Card>
      </>
    );
  }

  const list = sessions.data?.sessions ?? [];
  const existing = list.find((s) => toDateInput(s.date) === day);

  return (
    <>
      <PageHeader eyebrow="Manage" title="Attendance" description="Pick a course and a day, mark everyone, then save. Past days can be edited any time." />

      <CourseTabs courses={courses} value={courseId} onChange={setCourseId} />

      {sessions.loading ? (
        <Spinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <div className="xl:col-span-2 min-w-0">
            <DayPicker day={day} onChange={setDay} hasRecord={Boolean(existing)} />
            {/* remount the editor whenever the course, day or saved record changes */}
            <SessionEditor
              key={`${courseId}-${day}-${existing?._id ?? "new"}-${existing?.updatedAt ?? ""}`}
              courseId={courseId}
              day={day}
              existing={existing}
              onSaved={(session) =>
                sessions.setData((d) => ({ sessions: [session, ...(d?.sessions ?? []).filter((s) => s._id !== session._id)].sort((a, b) => new Date(b.date) - new Date(a.date)) }))
              }
              onDeleted={(id) => sessions.setData((d) => ({ sessions: (d?.sessions ?? []).filter((s) => s._id !== id) }))}
            />
          </div>
          <SessionHistory sessions={list} selectedDay={day} onPick={setDay} />
        </div>
      )}
    </>
  );
}

function DayPicker({ day, onChange, hasRecord }) {
  return (
    <Card className="p-3 sm:p-4 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onChange(shiftDay(day, -1))} aria-label="Previous day"><ChevronLeft size={18} /></Button>
        <label className="sr-only" htmlFor="attendance-day">Day</label>
        <div className="w-44">
          <Input id="attendance-day" type="date" value={day} max={todayInput()} onChange={(e) => e.target.value && onChange(e.target.value)} className="h-11 py-0" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => onChange(shiftDay(day, 1))} disabled={day >= todayInput()} aria-label="Next day"><ChevronRight size={18} /></Button>
      </div>
      <span className="font-display text-[17px] font-bold text-ink">{formatDay(`${day}T00:00:00Z`)}</span>
      <Badge tone={hasRecord ? "good" : "neutral"} className="ml-auto">{hasRecord ? "Recorded" : "Not recorded yet"}</Badge>
    </Card>
  );
}

function SessionEditor({ courseId, day, existing, onSaved, onDeleted }) {
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const upsertStudents = useAdminStore((s) => s.upsertStudents);

  const roster = useMemo(
    () => students
      .map((s) => ({ student: s, enrollment: s.courses?.find((e) => idOf(e.course) === courseId) }))
      .filter((row) => row.enrollment),
    [students, courseId]
  );

  const [marked, setMarked] = useState(() =>
    Object.fromEntries((existing?.records ?? []).map((r) => [String(r.student), r.status]))
  );
  const [topic, setTopic] = useState(existing?.topic ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const counts = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, roster.filter(({ student }) => marked[student._id] === o.value).length]));
  const markedCount = roster.filter(({ student }) => marked[student._id]).length;
  const courseName = courses.find((c) => c._id === courseId)?.courseName ?? "course";

  const markEveryone = (status) => setMarked(Object.fromEntries(roster.map(({ student }) => [student._id, status])));

  const save = async () => {
    const records = roster.filter(({ student }) => marked[student._id]).map(({ student }) => ({ student: student._id, status: marked[student._id] }));
    setSaving(true);
    try {
      const { data } = existing
        ? await api.patch(`/sessions/${existing._id}`, { records, topic })
        : await api.post(`/courses/${courseId}/sessions`, { date: day, records, topic });
      upsertStudents(data.students);
      onSaved(data.session);
      toast.success(existing ? "Attendance updated" : `Attendance saved for ${records.length} student${records.length === 1 ? "" : "s"} 🎉`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/sessions/${existing._id}`);
      upsertStudents(data.students);
      onDeleted(existing._id);
      toast.success("Attendance for that day was deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `${courseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-attendance-${dateStamp()}.csv`,
      ["Student", "Email", `Status on ${day}`, "Classes attended", "Classes counted", "Attendance %"],
      roster.map(({ student, enrollment }) => [
        fullName(student), student.email, marked[student._id] ?? "", enrollment.attendedClasses, enrollment.totalClasses,
        enrollment.totalClasses ? percent(enrollment.attendedClasses, enrollment.totalClasses) : "",
      ])
    );
  };

  if (roster.length === 0) {
    return (
      <Card>
        <EmptyState icon={CalendarCheck} title="No students in this course" message="Enroll students from the Courses page."
          action={<Link to="/admin/courses" className="font-semibold text-violet-600">Manage courses</Link>} />
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="sr-only" htmlFor="session-topic">Topic (optional)</label>
        <Input id="session-topic" placeholder="Topic covered (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} className="h-11 py-0" />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="h-11" onClick={() => markEveryone("present")}>
            <CheckCheck size={15} className="text-emerald-500" aria-hidden="true" /> All present
          </Button>
          <Button variant="secondary" size="sm" className="h-11" onClick={exportCsv} aria-label="Export to CSV">
            <Download size={15} className="text-violet-500" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Stagger as="ul" className="flex flex-col gap-3 pb-32">
        {roster.map(({ student, enrollment }) => {
          const pct = percent(enrollment.attendedClasses, enrollment.totalClasses);
          const state = marked[student._id];
          return (
            <Reveal as="li" key={student._id}>
              <Card className={cn(
                "p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 transition-all duration-300",
                state === "present" && "ring-2 ring-emerald-300/70",
                state === "late" && "ring-2 ring-amber-300/70",
                state === "absent" && "ring-2 ring-rose-300/70",
                state === "excused" && "ring-2 ring-slate-300/70"
              )}>
                <div className="flex items-center gap-3 md:w-60 min-w-0">
                  <Avatar person={student} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-ink truncate">{fullName(student)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ProgressBar value={pct} tone={enrollment.totalClasses ? attendanceTone(pct) : "violet"} className="w-16 h-1.5" label={`${fullName(student)} attendance`} />
                      <span className="text-[12px] font-semibold text-muted tabular-nums">
                        {enrollment.totalClasses ? `${pct}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 md:ml-auto" role="radiogroup" aria-label={`Attendance for ${fullName(student)}`}>
                  {STATUS_OPTIONS.map((o) => (
                    <motion.button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={state === o.value}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setMarked((m) => ({ ...m, [student._id]: m[student._id] === o.value ? undefined : o.value }))}
                      className={cn(
                        "h-10 px-3 rounded-xl text-[13px] font-semibold transition-all duration-200",
                        state === o.value ? o.on : "bg-surface text-ink-soft border border-line hover:border-violet-200"
                      )}
                    >
                      <span className="sm:hidden">{o.short}</span>
                      <span className="hidden sm:inline">{o.label}</span>
                    </motion.button>
                  ))}
                </div>
              </Card>
            </Reveal>
          );
        })}
      </Stagger>

      {/* Floating save bar, always within thumb reach */}
      <motion.div
        initial={{ y: 120 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.2 }}
        className="fixed z-20 bottom-4 inset-x-4 lg:left-[304px] lg:right-8 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-[1336px] mx-auto glass shadow-lift rounded-3xl px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">
              {markedCount ? `${markedCount} of ${roster.length} marked` : "Mark students to record this day"}
            </p>
            {markedCount > 0 && (
              <p className="text-[12px] text-muted truncate">
                <span className="text-emerald-600 font-semibold">{counts.present} present</span>
                {counts.late > 0 && <> · <span className="text-amber-600 font-semibold">{counts.late} late</span></>}
                {" · "}<span className="text-rose-500 font-semibold">{counts.absent} absent</span>
                {counts.excused > 0 && <> · {counts.excused} excused</>}
              </p>
            )}
          </div>
          {existing && (
            <Button variant="danger" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete this day's attendance">
              <Trash2 size={17} />
            </Button>
          )}
          <Button onClick={save} loading={saving} disabled={!markedCount}>
            <CalendarCheck size={17} aria-hidden="true" /> {existing ? "Update" : "Save"}
          </Button>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete attendance for ${formatDay(`${day}T00:00:00Z`)}?`}
        message="Everyone's totals for this course are adjusted. This can't be undone."
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function SessionHistory({ sessions, selectedDay, onPick }) {
  return (
    <Card className="xl:sticky xl:top-24 overflow-hidden">
      <CardHeader title="History" subtitle={`${sessions.length} day${sessions.length === 1 ? "" : "s"} recorded`} icon={History} />
      {sessions.length === 0 ? (
        <EmptyState icon={History} title="Nothing recorded yet" message="Saved days show up here." className="py-8" />
      ) : (
        <ul className="px-3 pb-3 max-h-[28rem] overflow-y-auto" data-lenis-prevent>
          {sessions.map((s) => {
            const present = s.records.filter((r) => r.status === "present" || r.status === "late").length;
            const counted = s.records.filter((r) => r.status !== "excused").length;
            const pct = percent(present, counted);
            const day = toDateInput(s.date);
            return (
              <li key={s._id}>
                <button
                  onClick={() => onPick(day)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors",
                    day === selectedDay ? "bg-violet-50" : "hover:bg-violet-50/60"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-ink">{formatDay(s.date)}</p>
                    <p className="text-[12px] text-muted truncate">{s.topic || `${present} of ${counted} attended`}</p>
                  </div>
                  <Badge tone={counted ? attendanceTone(pct) : "neutral"}>{counted ? `${pct}%` : "—"}</Badge>
                  <Pencil size={14} className="text-muted flex-shrink-0" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
