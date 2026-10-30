import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import api, { getErrorMessage } from "../../../api";
import Avatar from "../../../components/ui/Avatar";
import Button from "../../../components/ui/Button";
import { Card, EmptyState, PageHeader } from "../../../components/ui/Card";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Feedback";
import { Input } from "../../../components/ui/Form";
import { Reveal, Stagger } from "../../../components/ui/Motion";
import useAdminStore from "../../../store/useAdminStore";
import { attendanceOf, attendanceTone, fullName, idOf } from "../../../lib/format";
import { buttonClass } from "../../../lib/buttonStyles";
import { dateStamp, downloadCsv } from "../../../lib/csv";
import { toneFor } from "../../../lib/palette";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const removeStudent = useAdminStore((s) => s.removeStudent);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const courseName = useMemo(() => new Map(courses.map((c) => [c._id, c.courseName])), [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => `${fullName(s)} ${s.email}`.toLowerCase().includes(q));
  }, [students, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${pendingDelete._id}`);
      removeStudent(pendingDelete._id);
      toast.success(`${fullName(pendingDelete)} was deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // exports what's currently filtered (all students when the search box is empty)
  const exportCsv = () => {
    downloadCsv(
      `students-${dateStamp()}.csv`,
      ["First name", "Last name", "Email", "Gender", "Courses", "Classes attended", "Classes total", "Attendance %"],
      filtered.map((s) => {
        const att = attendanceOf(s.courses);
        const names = (s.courses || []).map((e) => courseName.get(idOf(e.course))).filter(Boolean).join("; ");
        return [s.firstName, s.lastName, s.email, s.gender, names, att.attended, att.total, att.total ? att.pct : ""];
      })
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Students"
        description={`${students.length} student${students.length === 1 ? "" : "s"} registered`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!students.length}>
              <Download size={17} aria-hidden="true" /> Export CSV
            </Button>
            <Link to="/admin/students/new" className={buttonClass()}>
              <Plus size={18} aria-hidden="true" /> Add student
            </Link>
          </>
        }
      />

      <div className="relative mb-5 sm:max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Search by name or email"
          aria-label="Search students"
          className="pl-11 shadow-soft"
        />
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={students.length ? "No students match your search" : "No students yet"}
            message={students.length ? "Try a different name or email." : "Add a student to get started."}
          />
        ) : (
          <>
            {/* Table on wide screens */}
            <table className="hidden xl:table w-full text-left">
              <thead>
                <tr className="text-[12px] font-bold uppercase tracking-wider text-muted border-b border-line">
                  <th scope="col" className="px-6 py-4">Student</th>
                  <th scope="col" className="px-6 py-4">Courses</th>
                  <th scope="col" className="px-6 py-4">Attendance</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <Stagger as="tbody" key={`${currentPage}-${query}`}>
                {visible.map((s) => {
                  const att = attendanceOf(s.courses);
                  return (
                    <Reveal as="tr" key={s._id} className="border-b border-line/70 last:border-0 hover:bg-violet-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar person={s} />
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-ink truncate">{fullName(s)}</p>
                            <p className="text-[13px] text-muted truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><CourseBadges student={s} courseName={courseName} /></td>
                      <td className="px-6 py-4">
                        {att.total ? <Badge tone={attendanceTone(att.pct)}>{att.pct}%</Badge> : <span className="text-[13px] text-muted">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <RowActions student={s} onDelete={() => setPendingDelete(s)} />
                      </td>
                    </Reveal>
                  );
                })}
              </Stagger>
            </table>

            {/* Cards on phones, tablets and laptops */}
            <Stagger as="ul" className="xl:hidden divide-y divide-line" key={`m-${currentPage}-${query}`}>
              {visible.map((s) => {
                const att = attendanceOf(s.courses);
                return (
                  <Reveal as="li" key={s._id} className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar person={s} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-ink truncate">{fullName(s)}</p>
                        <p className="text-[13px] text-muted truncate">{s.email}</p>
                      </div>
                      {att.total > 0 && <Badge tone={attendanceTone(att.pct)}>{att.pct}%</Badge>}
                    </div>
                    <div className="mt-3"><CourseBadges student={s} courseName={courseName} /></div>
                    <RowActions student={s} onDelete={() => setPendingDelete(s)} className="mt-3 justify-start" />
                  </Reveal>
                );
              })}
            </Stagger>

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-line">
                <p className="text-[13px] text-muted">
                  Page <span className="font-bold text-ink">{currentPage + 1}</span> of {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>
                    <ChevronLeft size={15} aria-hidden="true" /> Previous
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>
                    Next <ChevronRight size={15} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${fullName(pendingDelete)}?`}
        message="Their attendance and grades are deleted too. This can't be undone."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

function CourseBadges({ student, courseName }) {
  const ids = (student.courses || []).map((e) => idOf(e.course)).filter((id) => courseName.has(id));
  if (!ids.length) return <span className="text-[13px] text-muted">Not enrolled</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => <Badge key={id} palette={toneFor(id)}>{courseName.get(id)}</Badge>)}
    </div>
  );
}

function RowActions({ student, onDelete, className = "justify-end" }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <Link to={`/admin/students/${student._id}/edit`} className={buttonClass({ variant: "secondary", size: "sm" })}>
        <Pencil size={14} aria-hidden="true" /> Edit
      </Link>
      <Button variant="danger" size="sm" onClick={onDelete} aria-label={`Delete ${fullName(student)}`}>
        <Trash2 size={14} aria-hidden="true" /> Delete
      </Button>
    </div>
  );
}
