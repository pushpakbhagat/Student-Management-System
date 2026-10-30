import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BookOpen, Check, ClipboardList, Plus, Trash2, Users } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Form";
import { Reveal, Stagger } from "../../components/ui/Motion";
import useAdminStore from "../../store/useAdminStore";
import { fullName, idOf } from "../../lib/format";
import { toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";
import { scrollToElement } from "../../lib/smoothScroll";

export default function Courses() {
  const courses = useAdminStore((s) => s.courses);
  const students = useAdminStore((s) => s.students);
  const assignments = useAdminStore((s) => s.assignments);
  const addCourse = useAdminStore((s) => s.addCourse);
  const removeCourse = useAdminStore((s) => s.removeCourse);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const enrolledIn = (courseId) => students.filter((s) => s.courses?.some((e) => idOf(e.course) === courseId));
  const assignmentCount = (courseId) => assignments.filter((a) => idOf(a.course) === courseId).length;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/courses", { courseName: name.trim() });
      addCourse(data.course);
      setName("");
      toast.success(`${data.course.courseName} created`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/courses/${pendingDelete._id}`);
      removeCourse(pendingDelete._id);
      toast.success(`${pendingDelete.courseName} deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openCourse = courses.find((c) => c._id === openId);

  return (
    <>
      <PageHeader eyebrow="Catalog" title="Courses" description="Create courses and choose which students take them." />

      <Card className="p-2 mb-6 shadow-lift">
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="course-name" className="sr-only">New course name</label>
          <Input id="course-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name a new course, e.g. Mathematics"
            maxLength={100} className="border-transparent shadow-none hover:border-transparent" />
          <Button type="submit" loading={creating} disabled={!name.trim()} className="sm:w-auto">
            <Plus size={18} aria-hidden="true" /> Create course
          </Button>
        </form>
      </Card>

      {courses.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="No courses yet" message="Create your first course above." /></Card>
      ) : (
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((course) => {
            const enrolled = enrolledIn(course._id);
            const tone = toneFor(course._id);
            const isOpen = openId === course._id;
            return (
              <Reveal key={course._id}>
                <Card hover className={cn("overflow-hidden h-full flex flex-col", isOpen && "ring-2 ring-violet-400")}>
                  <div className={cn("relative h-28 bg-linear-to-br p-5 overflow-hidden", tone.gradient)}>
                    <div className="absolute -right-6 -bottom-10 w-32 h-32 rounded-full bg-white/20" aria-hidden="true" />
                    <div className="absolute right-10 -top-8 w-20 h-20 rounded-full bg-white/15" aria-hidden="true" />
                    <BookOpen size={64} className="absolute right-4 bottom-2 text-white/25 rotate-[-12deg]" aria-hidden="true" />
                    <h3 className="relative text-[22px] font-bold text-white leading-tight line-clamp-2 pr-10">{course.courseName}</h3>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 text-[13px] text-ink-soft font-semibold">
                      <span className="inline-flex items-center gap-1.5"><Users size={15} className={tone.text} aria-hidden="true" />{enrolled.length} student{enrolled.length === 1 ? "" : "s"}</span>
                      <span className="inline-flex items-center gap-1.5"><ClipboardList size={15} className={tone.text} aria-hidden="true" />{assignmentCount(course._id)} assignment{assignmentCount(course._id) === 1 ? "" : "s"}</span>
                    </div>
                    <div className="flex -space-x-2 mt-4 min-h-9">
                      {enrolled.slice(0, 6).map((s) => <Avatar key={s._id} person={s} size="sm" className="rounded-full" />)}
                      {enrolled.length > 6 && (
                        <span className="w-9 h-9 rounded-full bg-violet-50 ring-2 ring-surface text-[12px] font-bold text-violet-600 flex items-center justify-center">+{enrolled.length - 6}</span>
                      )}
                      {enrolled.length === 0 && <span className="text-[13px] text-muted self-center">No students yet</span>}
                    </div>
                    <div className="flex gap-2 mt-5 pt-4 border-t border-line">
                      <Button variant="secondary" size="sm" className="flex-1" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : course._id)}>
                        <Users size={14} aria-hidden="true" /> {isOpen ? "Close roster" : "Manage roster"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setPendingDelete(course)} aria-label={`Delete ${course.courseName}`}>
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </Stagger>
      )}

      <AnimatePresence>
        {openCourse && (
          <RosterEditor key={openCourse._id} course={openCourse} enrolled={enrolledIn(openCourse._id)} onDone={() => setOpenId(null)} />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.courseName}?`}
        message={
          pendingDelete
            ? `${enrolledIn(pendingDelete._id).length} student(s) will be un-enrolled and ${assignmentCount(pendingDelete._id)} assignment(s) deleted, along with all attendance and grades for this course.`
            : ""
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

// Checklist of every student; saving enrolls the newly ticked and removes the unticked
function RosterEditor({ course, enrolled, onDone }) {
  const students = useAdminStore((s) => s.students);
  const upsertStudents = useAdminStore((s) => s.upsertStudents);
  const initial = useMemo(() => new Set(enrolled.map((s) => s._id)), [enrolled]);
  const [selected, setSelected] = useState(() => new Set(initial));
  const [saving, setSaving] = useState(false);
  const tone = toneFor(course._id);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => scrollToElement(ref.current), 80);
    return () => clearTimeout(timer);
  }, []);

  const toAdd = [...selected].filter((sid) => !initial.has(sid));
  const toRemove = [...initial].filter((sid) => !selected.has(sid));
  const changes = toAdd.length + toRemove.length;

  const toggle = (sid) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const updated = [];
      if (toAdd.length) {
        const { data } = await api.patch("/enrollmultiplestudents", { CourseId: course._id, StudentsIds: toAdd });
        updated.push(...data.students);
      }
      for (const sid of toRemove) {
        const { data } = await api.delete(`/courses/${course._id}/students/${sid}`);
        updated.push(data.Student);
      }
      upsertStudents(updated);
      toast.success(`${course.courseName} roster updated`);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6"
    >
      <Card className="overflow-hidden shadow-lift">
        <div className={cn("bg-linear-to-r px-5 sm:px-6 py-4 text-white", tone.gradient)}>
          <p className="text-[12px] font-bold uppercase tracking-widest text-white/80">Roster</p>
          <h2 className="text-[20px] font-bold">{course.courseName}</h2>
        </div>
        <div className="p-5 sm:p-6">
          {students.length === 0 ? (
            <p className="text-[14px] text-muted">Add students first.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1" data-lenis-prevent>
              {students.map((s) => {
                const on = selected.has(s._id);
                return (
                  <li key={s._id}>
                    <label className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                      on ? "border-violet-400 bg-violet-50/70" : "border-line hover:border-violet-200 bg-surface"
                    )}>
                      <input type="checkbox" className="sr-only peer" checked={on} onChange={() => toggle(s._id)} />
                      <span className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-violet-500",
                        on ? "bg-brand-gradient" : "border-2 border-line"
                      )}>
                        {on && <Check size={14} strokeWidth={3} className="text-white" aria-hidden="true" />}
                      </span>
                      <Avatar person={s} size="sm" />
                      <span className="text-[14px] font-semibold text-ink truncate">{fullName(s)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {toRemove.length > 0 && (
            <p className="text-[13px] font-medium text-amber-700 bg-amber-50 rounded-2xl px-4 py-3 mt-4">
              Removing a student deletes their attendance and grades for this course.
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
            <Button variant="secondary" onClick={onDone} disabled={saving}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!changes}>
              Save roster{changes ? ` · ${changes} change${changes === 1 ? "" : "s"}` : ""}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
