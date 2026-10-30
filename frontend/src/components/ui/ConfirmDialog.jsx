import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import Button from "./Button";

// Native <dialog>: focus trapping, Esc to close and the backdrop come for free
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[28px] bg-surface border border-line p-0 text-ink shadow-lift
        backdrop:bg-ink/30 backdrop:backdrop-blur-sm
        opacity-0 scale-95 transition-all duration-200 open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-95"
    >
      <div className="p-6">
        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-rose-500" aria-hidden="true" />
        </div>
        <h2 className="text-[20px] font-bold text-ink">{title}</h2>
        {message && <p className="text-[14px] text-muted mt-1.5 leading-relaxed">{message}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="dangerSolid" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
