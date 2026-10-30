import { CalendarDays, ClipboardList } from "lucide-react";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Feedback";
import { Reveal, Stagger } from "../../components/ui/Motion";
import usePortalStore from "../../store/usePortalStore";
import { daysUntil, dueLabel, formatDate, idOf } from "../../lib/format";
import { toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

export default function StudentAssignments() {
  const assignments = usePortalStore((s) => s.assignments);

  const upcoming = assignments.filter((a) => !a.dueDate || daysUntil(a.dueDate) >= 0);
  const past = assignments.filter((a) => a.dueDate && daysUntil(a.dueDate) < 0).reverse();

  return (
    <>
      <PageHeader eyebrow="Coursework" title="Assignments" description="Assignments for the courses you're enrolled in." />

      {assignments.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No assignments yet" message="New assignments from your courses will appear here." /></Card>
      ) : (
        <div className="flex flex-col gap-10">
          <AssignmentList title="Upcoming" items={upcoming} empty="Nothing due — you're all caught up. 🎉" />
          {past.length > 0 && <AssignmentList title="Past due date" items={past} muted />}
        </div>
      )}
    </>
  );
}

function AssignmentList({ title, items, empty, muted = false }) {
  return (
    <section aria-label={title}>
      <h2 className="flex items-center gap-2 text-[20px] font-bold text-ink mb-4">
        {title}
        <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[13px] font-bold font-sans">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-[15px] text-muted">{empty}</p>
      ) : (
        <Stagger as="ul" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((a) => {
            const days = daysUntil(a.dueDate);
            const tone = toneFor(idOf(a.course));
            return (
              <Reveal as="li" key={a._id}>
                <Card hover className={cn("relative overflow-hidden h-full p-5 pl-7", muted && "opacity-60 saturate-50")}>
                  <span className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b", tone.gradient)} aria-hidden="true" />
                  <div className="flex items-start justify-between gap-3 mb-2">
                    {a.course?.courseName && <Badge palette={tone}>{a.course.courseName}</Badge>}
                    <Badge tone={muted ? "neutral" : days !== null && days <= 3 ? "bad" : days !== null && days <= 7 ? "warn" : "good"}>
                      {dueLabel(a.dueDate)}
                    </Badge>
                  </div>
                  <h3 className="text-[18px] font-bold text-ink break-words">{a.title}</h3>
                  {a.description && <p className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-line break-words mt-1">{a.description}</p>}
                  <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted mt-3">
                    <CalendarDays size={14} aria-hidden="true" /> {formatDate(a.dueDate)}
                  </p>
                </Card>
              </Reveal>
            );
          })}
        </Stagger>
      )}
    </section>
  );
}
