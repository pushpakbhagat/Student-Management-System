import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Camera, Check, QrCode, TimerOff } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Feedback";
import usePortalStore from "../../store/usePortalStore";
import { buttonClass } from "../../lib/buttonStyles";
import { formatDay } from "../../lib/format";

// Opened by scanning the classroom QR code: /student/checkin?c=<token>
export default function CheckIn() {
  const [params] = useSearchParams();
  const token = params.get("c");
  const updateProfile = usePortalStore((s) => s.updateProfile);
  const [state, setState] = useState(token ? { status: "checking" } : { status: "idle" });
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true; // the code is single-use per scan; don't send it twice in dev StrictMode
    api.post("/checkin", { token })
      .then(({ data }) => {
        setState({ status: "done", result: data });
        // refresh the attendance numbers shown elsewhere in the portal
        api.get("/me").then((res) => updateProfile(res.data.user)).catch(() => {});
      })
      .catch((error) => setState({ status: "error", message: getErrorMessage(error) }));
  }, [token, updateProfile]);

  return (
    <div className="max-w-md mx-auto pt-4 sm:pt-10">
      <Card className="p-8 text-center overflow-hidden relative">
        {state.status === "checking" && (
          <div className="py-10"><Spinner label="Checking you in" /><p className="mt-4 text-muted">Checking you in…</p></div>
        )}

        {state.status === "done" && (
          <>
            <motion.div
              initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 15 }}
              className="mx-auto w-24 h-24 rounded-[32px] bg-linear-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-[0_18px_40px_-12px_rgb(16_185_129/0.6)]"
            >
              <Check size={48} strokeWidth={3} aria-hidden="true" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h1 className="mt-6 text-[26px] font-bold text-ink">{state.result.already ? "Already checked in" : "You're checked in!"}</h1>
              <p className="text-[15px] text-ink-soft mt-1">
                <span className="font-semibold">{state.result.course?.courseName}</span> · {formatDay(state.result.date)}
              </p>
              <p className="text-[14px] text-muted mt-1">{state.result.already ? "You were marked present earlier." : "Marked present."} Enjoy the class!</p>
              <Link to="/student/attendance" className={buttonClass({ className: "mt-6" })}>See my attendance</Link>
            </motion.div>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className="mx-auto w-20 h-20 rounded-[28px] bg-amber-50 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center">
              <TimerOff size={36} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-[22px] font-bold text-ink">Couldn't check you in</h1>
            <p className="text-[15px] text-ink-soft mt-1">{state.message}</p>
            <p className="text-[13px] text-muted mt-3">Codes only last a few seconds, so a photo or a forwarded link won't work. Point your camera at the screen in class.</p>
          </>
        )}

        {state.status === "idle" && (
          <>
            <div className="mx-auto w-20 h-20 rounded-[28px] bg-brand-gradient text-white flex items-center justify-center shadow-glow">
              <QrCode size={36} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-[22px] font-bold text-ink">Class check-in</h1>
            <p className="text-[15px] text-ink-soft mt-1">When your teacher shows a QR code, open your phone's camera and point it at the screen.</p>
            <p className="inline-flex items-center gap-1.5 text-[13px] text-muted mt-4"><Camera size={14} aria-hidden="true" /> No app needed: the code opens this page and marks you present.</p>
          </>
        )}
      </Card>
    </div>
  );
}
