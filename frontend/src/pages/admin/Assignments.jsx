import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CalendarDays, ClipboardList, Plus, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import Button from "../../components/ui/Button";
import { Card, CardHeader, EmptyState, PageHeader } from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Badge } from "../../components/ui/Feedback";
import { Field, FormError, Input, Select, Textarea } from "../../components/ui/Form";
import useAdminStore from "../../store/useAdminStore";
import { daysUntil, dueLabel, formatDate, idOf, toDateInput } from "../../lib/format";
import { toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

const EMPTY = { title: "", description: "", dueDate: "", CourseId: "" };

function dueTone(dueDate) {
  const days = daysUntil(dueDate);
  if (days === null || days < 0) return "neutral";
  if (days <= 3) return "bad";
  if (days <= 7) return "warn";
  return "good";
}

export default function Assignments() {
  const courses = useAdminStore((s) => s.courses);
  const assignments = useAdminStore((s) => s.assignments);
  const addAssignment = useAdminStore((s) => s.addAssignment);
  const removeAssignment = useAdminStore((s) => s.removeAssignment);

  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const courseName = useMemo(() => new Map(courses.map((c) => [c._id, c.courseName])), [courses]);

  const visible = useMemo(
    () =>
      assignments
        .filter((a) => filter === "all" || idOf(a.course) === filter)
        .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)),
    [assignments, filter]
  );

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim() || !form.CourseId || !form.dueDate) {
      setFormError("Title, course and due date are required.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/assignments", { ...form, title: form.title.trim() });
      addAssignment(data.assignment);
      setForm(EMPTY);
      toast.success("Assignment created");
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/assignments/${pendingDelete._id}`);
      removeAssignment(pendingDelete._id);
      toast.success("Assignment deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Coursework" title="Assignments" description="Students see the assignments for the courses they're enrolled in." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Form first on phones, on the right on desktop */}
        <Card className="lg:order-2 lg:sticky lg:top-24 overflow-hidden">
          <div className="h-1.5 bg-brand-gradient" aria-hidden="true" />
          <CardHeader title="New assignment" icon={Plus} />
          <div className="px-5 sm:px-6 pb-6">
            {courses.length === 0 ? (
              <p className="text-[14px] text-muted">
                Create a <Link to="/admin/courses" className="font-semibold text-violet-600">course</Link> first.
              </p>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col gap-4" noValidate>
                <Field label="Title">
                  {(p) => <Input {...p} name="title" value={form.title} onChange={update} maxLength={200} placeholder="e.g. Chapter 3 exercises" />}
                </Field>
                <Field label="Description (optional)">
                  {(p) => <Textarea {...p} name="description" value={form.description} onChange={update} rows={3} maxLength={2000} />}
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <Field label="Course">
                    {(p) => (
                      <Select {...p} name="CourseId" value={form.CourseId} onChange={update}>
                        <option value="">Select course</option>
                        {courses.map((c) => <option key={c._id} value={c._id}>{c.courseName}</option>)}
                      </Select>
                    )}
                  </Field>
                  <Field label="Due date">
                    {(p) => <Input {...p} type="date" name="dueDate" value={form.dueDate} onChange={update} min={toDateInput(new Date())} />}
                  </Field>
                </div>
                <FormError message={formError} />
                <Button type="submit" loading={saving}>Create assignment</Button>
              </form>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2 lg:order-1 min-w-0">
          {/* course filter chips */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 mb-3" data-lenis-prevent>
            <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap" role="radiogroup" aria-label="Filter by course">
              {[{ _id: "all", courseName: "All courses" }, ...courses].map((c) => {
                const active = filter === c._id;
                const tone = c._id === "all" ? null : toneFor(c._id);
                return (
                  <button
                    key={c._id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFilter(c._id)}
                    className={cn(
                      "h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all",
                      active
                        ? cn("text-white shadow-soft bg-linear-to-r", tone ? tone.gradient : "from-violet-600 to-fuchsia-500")
                        : "bg-surface border border-line text-ink-soft hover:border-violet-200"
                    )}
                  >
                    {c.courseName}
                  </button>
                );
              })}
            </div>
          </div>

          {visible.length === 0 ? (
            <Card><EmptyState icon={ClipboardList} title="No assignments" message="Create one with the form." /></Card>
          ) : (
            <motion.ul layout className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {visible.map((a) => {
                  const tone = toneFor(idOf(a.course));
                  return (
                    <motion.li
                      key={a._id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Card hover className="relative overflow-hidden p-5 pl-7">
                        <span className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b", tone.gradient)} aria-hidden="true" />
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <h3 className="text-[17px] font-bold text-ink break-words">{a.title}</h3>
                              <Badge palette={tone}>{courseName.get(idOf(a.course)) ?? "Course"}</Badge>
                            </div>
                            {a.description && <p className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-line break-words">{a.description}</p>}
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-[13px] text-muted">
                              <CalendarDays size={14} aria-hidden="true" />
                              <span className="font-medium">{formatDate(a.dueDate)}</span>
                              <Badge tone={dueTone(a.dueDate)}>{dueLabel(a.dueDate)}</Badge>
                            </div>
                          </div>
                          <Button variant="danger" size="sm" onClick={() => setPendingDelete(a)} aria-label={`Delete ${a.title}`}>
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        </div>
                      </Card>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this assignment?"
        message={pendingDelete ? `"${pendingDelete.title}" will be removed for all students.` : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
