import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { CalendarDays, CheckCircle2, ClipboardList, Send } from "lucide-react";
import Button from "../../components/ui/Button";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Feedback";
import { Reveal, Stagger } from "../../components/ui/Motion";
import SubmissionDialog from "../../components/SubmissionDialog";
import usePortalStore from "../../store/usePortalStore";
import { useFetch } from "../../lib/useFetch";
import { daysUntil, dueLabel, formatDate, idOf } from "../../lib/format";
import { toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

export default function StudentAssignments() {
  const assignments = usePortalStore((s) => s.assignments);
  const { data, setData } = useFetch("/me/submissions");
  const [open, setOpen] = useState(null);

  const byAssignment = useMemo(
    () => new Map((data?.submissions ?? []).map((s) => [String(s.assignment), s])),
    [data]
  );

  const upcoming = assignments.filter((a) => !a.dueDate || daysUntil(a.dueDate) >= 0);
  const past = assignments.filter((a) => a.dueDate && daysUntil(a.dueDate) < 0).reverse();
  const handedIn = assignments.filter((a) => byAssignment.has(a._id)).length;

  const saved = (submission) =>
    setData((d) => ({ submissions: [...(d?.submissions ?? []).filter((s) => s._id !== submission._id), submission] }));

  const list = { byAssignment, onOpen: setOpen, loaded: Boolean(data) };

  return (
    <>
      <PageHeader
        eyebrow="Coursework"
        title="Assignments"
        description={assignments.length ? `You've handed in ${handedIn} of ${assignments.length}.` : "Assignments for the courses you're enrolled in."}
      />

      {assignments.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No assignments yet" message="New assignments from your courses will appear here." /></Card>
      ) : (
        <div className="flex flex-col gap-10">
          <AssignmentList title="Upcoming" items={upcoming} empty="Nothing due — you're all caught up. 🎉" {...list} />
          {past.length > 0 && <AssignmentList title="Past due date" items={past} muted {...list} />}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <SubmissionDialog
            key={open._id}
            assignment={open}
            submission={byAssignment.get(open._id)}
            onClose={() => setOpen(null)}
            onSaved={saved}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function SubmissionBadge({ submission }) {
  if (!submission) return <Badge tone="neutral">Not handed in</Badge>;
  if (submission.gradedAt) return <Badge tone="indigo">Graded · {submission.score}/100</Badge>;
  return <Badge tone={submission.late ? "warn" : "good"}><CheckCircle2 size={12} aria-hidden="true" /> {submission.late ? "Handed in late" : "Handed in"}</Badge>;
}

function AssignmentList({ title, items, empty, muted = false, byAssignment, onOpen, loaded }) {
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
            const submission = byAssignment.get(a._id);
            const faded = muted && !submission;
            return (
              <Reveal as="li" key={a._id}>
                <Card hover className={cn("relative overflow-hidden h-full p-5 pl-7 flex flex-col", faded && "opacity-70")}>
                  <span className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b", tone.gradient)} aria-hidden="true" />
                  <div className="flex items-start justify-between gap-3 mb-2">
                    {a.course?.courseName && <Badge palette={tone}>{a.course.courseName}</Badge>}
                    <Badge tone={muted || submission ? "neutral" : days !== null && days <= 3 ? "bad" : days !== null && days <= 7 ? "warn" : "good"}>
                      {dueLabel(a.dueDate)}
                    </Badge>
                  </div>
                  <h3 className="text-[18px] font-bold text-ink break-words">{a.title}</h3>
                  {a.description && <p className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-line break-words mt-1 line-clamp-3">{a.description}</p>}
                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted mr-auto">
                      <CalendarDays size={14} aria-hidden="true" /> {formatDate(a.dueDate)}
                    </span>
                    {loaded && <SubmissionBadge submission={submission} />}
                    <Button size="sm" variant={submission ? "secondary" : "primary"} onClick={() => onOpen(a)} disabled={!loaded}>
                      {submission ? "View" : <><Send size={14} aria-hidden="true" /> Hand in</>}
                    </Button>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </Stagger>
      )}
    </section>
  );
}
