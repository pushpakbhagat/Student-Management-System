import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Download, Inbox, X } from "lucide-react";
import api, { getErrorMessage } from "../api";
import Button from "./ui/Button";
import Avatar from "./ui/Avatar";
import { Badge, ErrorState, Spinner } from "./ui/Feedback";
import { Input, Textarea } from "./ui/Form";
import { useFetch } from "../lib/useFetch";
import { lockScroll } from "../lib/smoothScroll";
import { downloadFromApi, formatBytes } from "../lib/files";
import { formatDate, fullName } from "../lib/format";

// Staff view of one assignment: who handed in, their work, and a grade form per hand-in
export default function SubmissionsPanel({ assignment, onClose }) {
  const { data, error, reload, setData } = useFetch(`/assignments/${assignment._id}/submissions`);

  useEffect(() => {
    lockScroll(true);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const rows = data?.rows ?? [];
  const handedIn = rows.filter((r) => r.submission).length;
  const graded = rows.filter((r) => r.submission?.gradedAt).length;

  const saved = (submission) =>
    setData((d) => ({ rows: d.rows.map((r) => (r.submission?._id === submission._id ? { ...r, submission } : r)) }));

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Submissions for ${assignment.title}`}>
      <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-surface border border-line shadow-lift overflow-hidden"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-widest text-violet-600">Submissions</p>
            <h2 className="text-[20px] font-bold text-ink break-words">{assignment.title}</h2>
            {data && <p className="text-[13px] text-muted">{handedIn} of {rows.length} handed in · {graded} graded</p>}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-soft hover:bg-violet-50" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 flex flex-col gap-3" data-lenis-prevent>
          {error ? (
            <ErrorState message={getErrorMessage(error)} onRetry={reload} />
          ) : !data ? (
            <div className="py-16 flex justify-center"><Spinner /></div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <Inbox className="mx-auto mb-2 text-violet-400" aria-hidden="true" />
              No students are enrolled in this course yet.
            </div>
          ) : (
            rows.map((row) => <SubmissionRow key={row.student._id} {...row} onSaved={saved} />)
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SubmissionRow({ student, submission, onSaved }) {
  const [score, setScore] = useState(submission?.score ?? "");
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [saving, setSaving] = useState(false);

  const grade = async (e) => {
    e.preventDefault();
    const value = Number(score);
    if (score === "" || !Number.isFinite(value) || value < 0 || value > 100) return toast.error("Score must be 0–100");
    setSaving(true);
    try {
      const { data } = await api.patch(`/submissions/${submission._id}/grade`, { score: value, feedback });
      onSaved(data.submission);
      toast.success(`Graded ${student.firstName}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const download = () =>
    downloadFromApi(`/submissions/${submission._id}/file`, submission.file.name).catch((err) => toast.error(getErrorMessage(err)));

  return (
    <div className="rounded-3xl border border-line bg-canvas/50 p-4">
      <div className="flex items-center gap-3">
        <Avatar person={student} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">{fullName(student)}</p>
          <p className="text-[12px] text-muted truncate">{submission ? `Handed in ${formatDate(submission.submittedAt)}` : student.email}</p>
        </div>
        {!submission ? (
          <Badge tone="neutral">Missing</Badge>
        ) : submission.gradedAt ? (
          <Badge tone="indigo">{submission.score}/100</Badge>
        ) : (
          <Badge tone={submission.late ? "warn" : "good"}>{submission.late ? "Late" : "On time"}</Badge>
        )}
      </div>

      {submission && (
        <div className="mt-3 flex flex-col gap-3">
          {submission.text && <p className="text-[14px] text-ink-soft whitespace-pre-line break-words rounded-2xl bg-surface border border-line p-3 max-h-40 overflow-y-auto" data-lenis-prevent>{submission.text}</p>}
          {submission.file?.name && (
            <Button variant="secondary" size="sm" className="self-start max-w-full" onClick={download}>
              <Download size={14} aria-hidden="true" /> <span className="truncate">{submission.file.name}</span>
              <span className="text-muted font-normal">{formatBytes(submission.file.size)}</span>
            </Button>
          )}
          <form onSubmit={grade} className="grid grid-cols-[88px_1fr] sm:grid-cols-[88px_1fr_auto] gap-2 items-start">
            <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="/100" aria-label={`Score for ${fullName(student)}`} />
            <Textarea rows={1} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} placeholder="Feedback (optional)" aria-label={`Feedback for ${fullName(student)}`} className="min-h-11" />
            <Button type="submit" loading={saving} className="col-span-2 sm:col-span-1">{submission.gradedAt ? "Update" : "Grade"}</Button>
          </form>
        </div>
      )}
    </div>
  );
}
