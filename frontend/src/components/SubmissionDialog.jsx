import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Award, Download, FileUp, Paperclip, X } from "lucide-react";
import api, { getErrorMessage } from "../api";
import Button from "./ui/Button";
import { Badge } from "./ui/Feedback";
import { FormError, Textarea } from "./ui/Form";
import { lockScroll } from "../lib/smoothScroll";
import { ACCEPTED_UPLOADS, downloadFromApi, fileToUpload, formatBytes } from "../lib/files";
import { dueLabel, formatDate } from "../lib/format";

// Student hand-in for one assignment: write an answer and/or attach a file
export default function SubmissionDialog({ assignment, submission, onClose, onSaved }) {
  const graded = Boolean(submission?.gradedAt);
  const [text, setText] = useState(submission?.text ?? "");
  const [file, setFile] = useState(null); // { name, type, data, size }
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    lockScroll(true);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const pick = async (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    setError("");
    try {
      setFile({ ...(await fileToUpload(chosen)), size: chosen.size });
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async () => {
    setError("");
    if (!text.trim() && !file && !submission?.file?.name) return setError("Write an answer or attach a file.");
    setSaving(true);
    try {
      const body = { text };
      if (file) body.file = { name: file.name, type: file.type, data: file.data };
      const { data } = await api.put(`/assignments/${assignment._id}/submission`, body);
      onSaved(data.submission);
      toast.success(data.submission.late ? "Handed in (late)" : "Handed in 🎉");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const existingFile = submission?.file?.name;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Hand in ${assignment.title}`} data-lenis-prevent>
      <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-surface border border-line shadow-lift"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="sticky top-0 bg-surface/95 backdrop-blur px-6 pt-5 pb-4 border-b border-line flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-widest text-violet-600">{assignment.course?.courseName}</p>
            <h2 className="text-[20px] font-bold text-ink">{assignment.title}</h2>
            <p className="text-[13px] text-muted">Due {formatDate(assignment.dueDate)} · {dueLabel(assignment.dueDate)}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-soft hover:bg-violet-50" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {assignment.description && <p className="text-[14px] text-ink-soft whitespace-pre-line">{assignment.description}</p>}

          {graded && (
            <div className="rounded-3xl bg-linear-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-5 flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-gradient text-white flex flex-col items-center justify-center flex-shrink-0">
                <Award size={16} aria-hidden="true" />
                <span className="font-display text-[18px] font-extrabold leading-none">{submission.score}</span>
              </div>
              <div>
                <p className="font-bold text-ink">Graded: {submission.score}/100</p>
                <p className="text-[14px] text-ink-soft mt-0.5 whitespace-pre-line">{submission.feedback || "No written feedback."}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="answer" className="text-[13px] font-semibold text-ink-soft">Your answer</label>
            <Textarea id="answer" rows={5} value={text} onChange={(e) => setText(e.target.value)} disabled={graded} maxLength={5000} placeholder="Type your answer here (optional if you attach a file)" className="mt-1.5" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input ref={input} type="file" accept={ACCEPTED_UPLOADS} className="sr-only" onChange={pick} tabIndex={-1} aria-hidden="true" />
            {!graded && (
              <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
                <FileUp size={15} aria-hidden="true" /> {existingFile || file ? "Replace file" : "Attach a file"}
              </Button>
            )}
            <AnimatePresence>
              {(file || existingFile) && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <Paperclip size={14} className="text-violet-500" aria-hidden="true" />
                  {file ? `${file.name} · ${formatBytes(file.size)}` : `${existingFile} · ${formatBytes(submission.file.size)}`}
                  {!file && existingFile && (
                    <button onClick={() => downloadFromApi(`/submissions/${submission._id}/file`, existingFile).catch((e) => toast.error(getErrorMessage(e)))}
                      className="ml-1 text-violet-600 hover:text-fuchsia-600" aria-label="Download your file"><Download size={14} /></button>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="text-[12px] text-muted">PDF, image, Word or text file · up to 2 MB. You can change your hand-in until it's graded.</p>

          {submission && !graded && <Badge tone={submission.late ? "warn" : "good"} className="self-start">{submission.late ? "Handed in late" : "Handed in"} · {formatDate(submission.submittedAt)}</Badge>}

          <FormError message={error} />
          {!graded && (
            <Button onClick={submit} loading={saving} className="h-12">{submission ? "Update hand-in" : "Hand in"}</Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
