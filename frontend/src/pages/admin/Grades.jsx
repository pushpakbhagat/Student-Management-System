import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BookOpen, Download, GraduationCap, Plus, Save, Trash2, X } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { Card, CardHeader, EmptyState, PageHeader } from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Badge, Spinner } from "../../components/ui/Feedback";
import { Field, FormError, Input, Select } from "../../components/ui/Form";
import CourseTabs from "../../components/CourseTabs";
import useAdminStore from "../../store/useAdminStore";
import { useFetch } from "../../lib/useFetch";
import { computeGrade, gradeTone, KINDS } from "../../lib/grades";
import { formatShortDate, fullName, idOf } from "../../lib/format";
import { dateStamp, downloadCsv } from "../../lib/csv";
import { cn } from "../../lib/cn";

export default function Grades() {
  const courses = useAdminStore((s) => s.courses);
  const [courseId, setCourseId] = useState(() => courses[0]?._id ?? null);
  const assessments = useFetch(courseId ? `/courses/${courseId}/assessments` : null);

  if (courses.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Academics" title="Grades" />
        <Card>
          <EmptyState icon={BookOpen} title="No courses yet" message="Create a course first."
            action={<Link to="/admin/courses" className="font-semibold text-violet-600">Go to courses</Link>} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Academics" title="Grades" description="Add quizzes, assignments and exams with a weight, then fill in scores. Grades update as you type." />
      <CourseTabs courses={courses} value={courseId} onChange={setCourseId} id="grades-tab" />
      {assessments.loading ? (
        <Spinner className="py-16" />
      ) : (
        <Gradebook
          key={courseId}
          courseId={courseId}
          assessments={assessments.data?.assessments ?? []}
          setAssessments={(update) => assessments.setData((d) => ({ assessments: update(d?.assessments ?? []) }))}
        />
      )}
    </>
  );
}

function Gradebook({ courseId, assessments, setAssessments }) {
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const roster = useMemo(() => students.filter((s) => s.courses?.some((e) => idOf(e.course) === courseId)), [students, courseId]);

  const [drafts, setDrafts] = useState({}); // assessmentId -> studentId -> string
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const savedScore = (a, sid) => a.scores.find((s) => String(s.student) === sid)?.score;
  const cellValue = (a, sid) => drafts[a._id]?.[sid] ?? (savedScore(a, sid) ?? "");
  const changedCount = Object.values(drafts).reduce((n, byStudent) => n + Object.keys(byStudent).length, 0);
  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);

  const gradeFor = (sid) =>
    computeGrade(assessments.map((a) => {
      const v = cellValue(a, sid);
      return { maxScore: a.maxScore, weight: a.weight, score: v === "" ? null : Number(v) };
    }));

  const setCell = (a, sid, value) => {
    setDrafts((d) => {
      const next = { ...d, [a._id]: { ...(d[a._id] ?? {}), [sid]: value } };
      // typing the saved value back means "no change"
      if (String(savedScore(a, sid) ?? "") === value) delete next[a._id][sid];
      if (!Object.keys(next[a._id]).length) delete next[a._id];
      return next;
    });
  };

  const invalid = assessments.some((a) =>
    Object.values(drafts[a._id] ?? {}).some((v) => v !== "" && (Number.isNaN(Number(v)) || Number(v) < 0 || Number(v) > a.maxScore))
  );

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [assessmentId, byStudent] of Object.entries(drafts)) {
        const scores = Object.entries(byStudent).map(([student, v]) => ({ student, score: v === "" ? null : Number(v) }));
        const { data } = await api.put(`/assessments/${assessmentId}/scores`, { scores });
        setAssessments((list) => list.map((a) => (a._id === assessmentId ? data.assessment : a)));
      }
      setDrafts({});
      toast.success("Scores saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/assessments/${pendingDelete._id}`);
      setAssessments((list) => list.filter((a) => a._id !== pendingDelete._id));
      setDrafts((d) => { const next = { ...d }; delete next[pendingDelete._id]; return next; });
      toast.success(`${pendingDelete.title} deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    const name = courses.find((c) => c._id === courseId)?.courseName ?? "course";
    downloadCsv(
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-grades-${dateStamp()}.csv`,
      ["Student", "Email", ...assessments.map((a) => `${a.title} (/${a.maxScore}, ${a.weight}%)`), "Grade %", "Letter"],
      roster.map((s) => {
        const g = gradeFor(s._id);
        return [fullName(s), s.email, ...assessments.map((a) => cellValue(a, s._id)), g?.percent ?? "", g?.letter ?? ""];
      })
    );
  };

  if (roster.length === 0) {
    return (
      <Card>
        <EmptyState icon={GraduationCap} title="No students in this course" message="Enroll students from the Courses page."
          action={<Link to="/admin/courses" className="font-semibold text-violet-600">Manage courses</Link>} />
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-[14px] text-ink-soft mr-auto">
          {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
          {assessments.length > 0 && <> · total weight <span className="font-semibold">{totalWeight}%</span></>}
        </p>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!assessments.length}>
          <Download size={15} className="text-violet-500" aria-hidden="true" /> Export
        </Button>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />} {showForm ? "Close" : "New assessment"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <NewAssessmentForm courseId={courseId} onCreated={(a) => { setAssessments((list) => [...list, a]); setShowForm(false); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {assessments.length === 0 ? (
        <Card><EmptyState icon={GraduationCap} title="No assessments yet" message="Add a quiz, assignment or exam to start grading." /></Card>
      ) : (
        <Card className="overflow-hidden mb-28">
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="text-[12px] text-muted">
                  <th scope="col" className="sticky left-0 z-10 bg-surface px-5 py-4 font-bold uppercase tracking-wider border-b border-line min-w-48">Student</th>
                  {assessments.map((a) => (
                    <th key={a._id} scope="col" className="px-3 py-3 border-b border-line align-top min-w-32">
                      <div className="flex items-start gap-1">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-ink truncate max-w-36">{a.title}</p>
                          <p className="text-[11px] font-medium capitalize">{a.kind} · /{a.maxScore} · {a.weight}%</p>
                          {a.date && <p className="text-[11px]">{formatShortDate(a.date)}</p>}
                        </div>
                        <button onClick={() => setPendingDelete(a)} className="ml-auto p-1 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-50" aria-label={`Delete ${a.title}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-4 font-bold uppercase tracking-wider border-b border-line text-right min-w-28">Grade</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => {
                  const g = gradeFor(s._id);
                  return (
                    <tr key={s._id} className="group">
                      <th scope="row" className="sticky left-0 z-10 bg-surface group-hover:bg-violet-50 transition-colors px-5 py-3 border-b border-line/70 font-normal">
                        <div className="flex items-center gap-3">
                          <Avatar person={s} size="sm" />
                          <span className="text-[14px] font-semibold text-ink truncate max-w-40">{fullName(s)}</span>
                        </div>
                      </th>
                      {assessments.map((a) => {
                        const value = cellValue(a, s._id);
                        const dirty = drafts[a._id]?.[s._id] !== undefined;
                        const bad = value !== "" && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > a.maxScore);
                        return (
                          <td key={a._id} className="px-3 py-2 border-b border-line/70 group-hover:bg-violet-50/40 transition-colors">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={a.maxScore}
                              step="any"
                              value={value}
                              onChange={(e) => setCell(a, s._id, e.target.value)}
                              aria-label={`${a.title} score for ${fullName(s)}`}
                              aria-invalid={bad || undefined}
                              placeholder="—"
                              className={cn(
                                "w-20 h-10 rounded-xl px-3 text-[14px] font-semibold tabular-nums bg-surface border outline-none transition-all",
                                "focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10",
                                bad ? "border-rose-400 text-rose-600" : dirty ? "border-amber-300 bg-amber-50 text-ink" : "border-line text-ink"
                              )}
                            />
                          </td>
                        );
                      })}
                      <td className="px-5 py-2 border-b border-line/70 text-right group-hover:bg-violet-50/40 transition-colors">
                        {g ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-muted tabular-nums">{g.percent}%</span>
                            <Badge tone={gradeTone(g.letter)} className="text-[13px] px-3">{g.letter}</Badge>
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {changedCount > 0 && (
          <motion.div
            initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed z-20 bottom-4 inset-x-4 lg:left-[304px] lg:right-8 pb-[env(safe-area-inset-bottom)]"
          >
            <div className="max-w-[1336px] mx-auto glass shadow-lift rounded-3xl px-4 sm:px-6 py-3.5 flex items-center gap-3">
              <p className="flex-1 text-[14px] font-bold text-ink">
                {changedCount} unsaved score{changedCount === 1 ? "" : "s"}
                {invalid && <span className="block text-[12px] font-semibold text-rose-600">Some scores are above the max or below 0</span>}
              </p>
              <Button variant="ghost" onClick={() => setDrafts({})} disabled={saving}>Discard</Button>
              <Button onClick={saveAll} loading={saving} disabled={invalid}>
                <Save size={17} aria-hidden="true" /> Save scores
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.title}?`}
        message="All scores for it are deleted and everyone's grade is recalculated."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

const EMPTY = { title: "", kind: "quiz", maxScore: "100", weight: "10", date: "" };

function NewAssessmentForm({ courseId, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Give it a title.");
    setSaving(true);
    try {
      const { data } = await api.post(`/courses/${courseId}/assessments`, {
        title: form.title.trim(),
        kind: form.kind,
        maxScore: Number(form.maxScore),
        weight: Number(form.weight),
        date: form.date || undefined,
      });
      onCreated(data.assessment);
      toast.success(`${data.assessment.title} added`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Card className="mb-5">
      <CardHeader title="New assessment" icon={Plus} />
      <form onSubmit={submit} noValidate className="px-5 sm:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
        <Field label="Title" className="xl:col-span-2">{(p) => <Input {...p} name="title" value={form.title} onChange={update} placeholder="e.g. Quiz 2" maxLength={120} />}</Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} name="kind" value={form.kind} onChange={update}>
              {KINDS.map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Max score">{(p) => <Input {...p} type="number" min="1" name="maxScore" value={form.maxScore} onChange={update} />}</Field>
        <Field label="Weight %" hint="Share of the final grade">{(p) => <Input {...p} type="number" min="0" max="100" name="weight" value={form.weight} onChange={update} />}</Field>
        <Field label="Date (optional)" className="xl:col-span-2">{(p) => <Input {...p} type="date" name="date" value={form.date} onChange={update} />}</Field>
        <div className="sm:col-span-2 xl:col-span-3 flex flex-col gap-3">
          <FormError message={error} />
          <Button type="submit" loading={saving} className="sm:self-start">Add assessment</Button>
        </div>
      </form>
    </Card>
  );
}
