import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import api, { getErrorMessage } from "../../../api";
import Avatar from "../../../components/ui/Avatar";
import Button from "../../../components/ui/Button";
import { Card, EmptyState, PageHeader } from "../../../components/ui/Card";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { Badge, ErrorState, Spinner } from "../../../components/ui/Feedback";
import { Input, Select } from "../../../components/ui/Form";
import { Reveal, Stagger } from "../../../components/ui/Motion";
import useAdminStore from "../../../store/useAdminStore";
import useSessionStore from "../../../store/useSessionStore";
import { attendanceOf, attendanceTone, fullName, idOf } from "../../../lib/format";
import { buttonClass } from "../../../lib/buttonStyles";
import { dateStamp, downloadCsv } from "../../../lib/csv";
import { toneFor } from "../../../lib/palette";
import { useFetch } from "../../../lib/useFetch";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const removeStudent = useAdminStore((s) => s.removeStudent);
  const isAdmin = useSessionStore((s) => s.role) === "admin";

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(""); // the query, once typing pauses
  const [courseFilter, setCourseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const courseName = useMemo(() => new Map(courses.map((c) => [c._id, c.courseName])), [courses]);

  // search on the server once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // the server does the paging and searching; the last page stays on screen while the next loads
  const params = new URLSearchParams({ page, limit: PAGE_SIZE });
  if (search) params.set("q", search);
  if (courseFilter) params.set("course", courseFilter);
  const list = useFetch(`/students?${params}`, { keepPrevious: true });
  const visible = list.data?.students ?? [];
  const total = list.data?.total ?? 0;
  const pageCount = list.data?.pages ?? 1;
  const currentPage = (list.data?.page ?? 1) - 1;
  const filtering = Boolean(search || courseFilter);

  // CSV export covers every match, not just this page, so it uses the full list already loaded
  const matching = useMemo(() => {
    const words = search.toLowerCase().split(/s+/).filter(Boolean);
    return students.filter((s) => {
      if (courseFilter && !(s.courses || []).some((e) => idOf(e.course) === courseFilter)) return false;
      const text = `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [students, search, courseFilter]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${pendingDelete._id}`);
      removeStudent(pendingDelete._id);
      list.reload();
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
      matching.map((s) => {
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
            {isAdmin && (
              <Link to="/admin/students/new" className={buttonClass()}>
                <Plus size={18} aria-hidden="true" /> Add student
              </Link>
            )}
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative sm:max-w-md flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search students"
            className="pl-11 shadow-soft"
          />
          {list.loading && list.data && (
            <span role="status" aria-label="Searching" className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-violet-100 border-t-violet-500 animate-spin" />
          )}
        </div>
        <Select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} aria-label="Filter by course" className="sm:w-56 shadow-soft">
          <option value="">All courses</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.courseName}</option>)}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {list.error ? (
          <ErrorState message={getErrorMessage(list.error)} onRetry={list.reload} />
        ) : !list.data ? (
          <Spinner className="py-16" />
        ) : total === 0 ? (
          <EmptyState
            icon={Users}
            title={filtering ? "No students match" : "No students yet"}
            message={filtering ? "Try a different name, email or course." : "Add a student to get started."}
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
              <Stagger as="tbody" key={`${currentPage}-${search}-${courseFilter}`}>
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
            <Stagger as="ul" className="xl:hidden divide-y divide-line" key={`m-${currentPage}-${search}-${courseFilter}`}>
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
                  Page <span className="font-bold text-ink">{currentPage + 1}</span> of {pageCount} · {total} student{total === 1 ? "" : "s"}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage(currentPage)} disabled={currentPage === 0 || list.loading}>
                    <ChevronLeft size={15} aria-hidden="true" /> Previous
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage(currentPage + 2)} disabled={currentPage >= pageCount - 1 || list.loading}>
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

// Everyone on staff can open the report card; only admins edit or delete
function RowActions({ student, onDelete, className = "justify-end" }) {
  const isAdmin = useSessionStore((s) => s.role) === "admin";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Link to={`/admin/students/${student._id}/report`} className={buttonClass({ variant: "secondary", size: "sm" })}>
        <FileText size={14} aria-hidden="true" /> Report
      </Link>
      {isAdmin && (
        <>
          <Link to={`/admin/students/${student._id}/edit`} className={buttonClass({ variant: "secondary", size: "sm" })}>
            <Pencil size={14} aria-hidden="true" /> Edit
          </Link>
          <Button variant="danger" size="sm" onClick={onDelete} aria-label={`Delete ${fullName(student)}`}>
            <Trash2 size={14} aria-hidden="true" /> Delete
          </Button>
        </>
      )}
    </div>
  );
}
