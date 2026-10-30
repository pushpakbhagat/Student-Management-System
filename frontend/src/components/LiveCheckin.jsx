import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { CheckCheck, QrCode, Users, X } from "lucide-react";
import api, { getErrorMessage } from "../api";
import Avatar from "./ui/Avatar";
import Button from "./ui/Button";
import { ErrorState, Ring, Spinner } from "./ui/Feedback";
import useAdminStore from "../store/useAdminStore";
import { lockScroll } from "../lib/smoothScroll";
import { formatDay, fullName, percent, todayInput } from "../lib/format";

const POLL_MS = 3000;

// Full-screen QR for the classroom projector. The code changes every few seconds,
// so a photo of it sent to a friend at home stops working almost straight away.
export default function LiveCheckin({ course, onClose, onFinished }) {
  const upsertStudents = useAdminStore((s) => s.upsertStudents);
  const [state, setState] = useState({ status: "opening" }); // opening | live | error
  const [qr, setQr] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [roster, setRoster] = useState([]);

  // open the session, then keep polling for a fresh code and new check-ins
  useEffect(() => {
    let cancelled = false;
    let timer;
    const show = async ({ session, token }) => {
      if (cancelled) return;
      if (token) {
        const url = `${window.location.origin}/student/checkin?c=${encodeURIComponent(token)}`;
        const image = await QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1e1b4b", light: "#ffffff" } });
        if (!cancelled) setQr(image);
      }
      if (!cancelled) setState({ status: "live", session });
    };
    const poll = async (id) => {
      try {
        const { data } = await api.get(`/sessions/${id}/checkin`);
        await show(data);
      } catch {
        // a missed poll is fine; the next one will catch up
      }
      if (!cancelled) timer = setTimeout(() => poll(id), POLL_MS);
    };

    api.post(`/courses/${course._id}/checkin`, { date: todayInput() })
      .then(async ({ data }) => {
        setRoster(data.roster);
        await show(data);
        if (!cancelled) timer = setTimeout(() => poll(data.session._id), POLL_MS);
      })
      .catch((error) => !cancelled && setState({ status: "error", error }));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [course._id]);

  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, []);

  const session = state.session;
  const present = new Set((session?.records ?? []).filter((r) => r.status === "present" || r.status === "late").map((r) => String(r.student)));
  const arrived = roster.filter((s) => present.has(String(s._id)));
  const total = roster.length;

  const finish = async () => {
    setFinishing(true);
    try {
      const { data } = await api.post(`/sessions/${session._id}/finish`);
      upsertStudents(data.students);
      toast.success(`Check-in closed · ${arrived.length} present, ${data.markedAbsent} marked absent`);
      onFinished(data.session);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setFinishing(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] bg-canvas overflow-y-auto"
      role="dialog" aria-modal="true" aria-label={`Live check-in for ${course.courseName}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      data-lenis-prevent
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgb(167_139_250/0.25),transparent),radial-gradient(50%_40%_at_100%_100%,rgb(244_114_182/0.18),transparent)] pointer-events-none" aria-hidden="true" />

      <div className="relative min-h-full max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col">
        <header className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-glow"><QrCode size={20} aria-hidden="true" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-widest text-violet-600">Live check-in · {formatDay(`${todayInput()}T00:00:00Z`)}</p>
            <h2 className="text-[22px] sm:text-[28px] font-bold text-ink truncate">{course.courseName}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close (check-in stays open)"><X size={20} /></Button>
        </header>

        {state.status === "error" ? (
          <ErrorState message={getErrorMessage(state.error)} onRetry={onClose} />
        ) : state.status === "opening" ? (
          <Spinner className="py-32" label="Opening check-in" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 items-start flex-1">
            <div className="rounded-[32px] bg-surface border border-line shadow-lift p-5 sm:p-8 flex flex-col items-center text-center">
              <div className="relative w-full max-w-[420px] aspect-square rounded-3xl bg-white p-3 ring-1 ring-violet-100">
                <AnimatePresence mode="popLayout">
                  {qr && <motion.img key={qr} src={qr} alt="Check-in QR code" className="w-full h-full" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
                </AnimatePresence>
              </div>
              <p className="mt-5 text-[17px] font-semibold text-ink">Scan with your phone camera</p>
              <p className="text-[14px] text-muted mt-1 max-w-sm">Log in to StudentHub on your phone first. The code refreshes every few seconds, so it only works in this room.</p>
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              <div className="rounded-[28px] bg-surface border border-line shadow-soft p-5 flex items-center gap-5">
                <Ring value={percent(arrived.length, total)} size={92} stroke={10} color="#7c3aed" colorTo="#db2777" label={`${arrived.length} of ${total} checked in`}>
                  <span className="font-display text-[22px] font-extrabold text-ink">{arrived.length}</span>
                </Ring>
                <div>
                  <p className="font-display text-[26px] font-bold text-ink leading-none">{arrived.length}<span className="text-muted text-[18px]"> / {total}</span></p>
                  <p className="text-[14px] text-muted mt-1">students checked in</p>
                </div>
              </div>

              <div className="rounded-[28px] bg-surface border border-line shadow-soft p-5 min-h-48">
                <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-ink-soft mb-3"><Users size={15} aria-hidden="true" /> Here now</p>
                {arrived.length === 0 ? (
                  <p className="text-[14px] text-muted py-6 text-center">Waiting for the first scan…</p>
                ) : (
                  <ul className="flex flex-wrap gap-2" aria-live="polite">
                    <AnimatePresence initial={false}>
                      {arrived.map((s) => (
                        <motion.li key={s._id} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}
                          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-emerald-50 ring-1 ring-emerald-100">
                          <Avatar person={s} size="xs" className="rounded-full" />
                          <span className="text-[13px] font-semibold text-emerald-800">{fullName(s)}</span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              <Button onClick={finish} loading={finishing} className="h-12">
                <CheckCheck size={17} aria-hidden="true" /> Finish & mark the rest absent
              </Button>
              <p className="text-[12px] text-muted text-center -mt-2">You can still change anyone's status afterwards.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
