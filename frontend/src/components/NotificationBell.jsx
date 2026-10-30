import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Bell, CalendarClock, CheckCheck, ClipboardList, GraduationCap, Megaphone } from "lucide-react";
import useSessionStore from "../store/useSessionStore";
import { useFetch } from "../lib/useFetch";
import { timeAgo } from "../lib/format";
import { cn } from "../lib/cn";

const TYPES = {
  due: { icon: ClipboardList, className: "bg-amber-100 text-amber-600" },
  attendance: { icon: AlertTriangle, className: "bg-rose-100 text-rose-600" },
  risk: { icon: AlertTriangle, className: "bg-rose-100 text-rose-600" },
  news: { icon: Megaphone, className: "bg-teal-100 text-teal-600" },
  grade: { icon: GraduationCap, className: "bg-violet-100 text-violet-600" },
  todo: { icon: CalendarClock, className: "bg-sky-100 text-sky-600" },
};

// Which notifications this browser has already shown; kept per user in localStorage
function readSeen(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

export default function NotificationBell() {
  const user = useSessionStore((s) => s.user);
  const navigate = useNavigate();
  const { data, reload } = useFetch("/me/notifications");
  const items = useMemo(() => data?.notifications ?? [], [data]);
  const storageKey = `studenthub-seen-${user?._id}`;
  const [seen, setSeen] = useState(() => readSeen(storageKey));
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // refresh every two minutes
  useEffect(() => {
    const timer = setInterval(reload, 120000);
    return () => clearInterval(timer);
  }, [reload]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !panelRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !seen.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set([...seen, ...items.map((n) => n.id)]);
    setSeen(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next].slice(-300)));
    } catch {
      // private mode - fine for this visit
    }
  };

  const toggle = () => {
    setOpen((o) => !o);
    if (!open && unread) setTimeout(markAllRead, 1500);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-ink-soft hover:bg-violet-50 hover:text-violet-600 transition-colors"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <motion.span key={unread} animate={unread ? { rotate: [0, -14, 12, -8, 6, 0] } : {}} transition={{ duration: 0.6 }}>
          <Bell size={18} />
        </motion.span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gradient text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-[4.5rem] sm:top-12 sm:w-96 rounded-3xl bg-surface border border-line shadow-lift overflow-hidden z-50 origin-top-right"
            data-lenis-prevent
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <p className="font-display text-[16px] font-bold text-ink">Notifications</p>
              {items.length > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:text-fuchsia-600">
                  <CheckCheck size={14} aria-hidden="true" /> Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-5 py-10 text-center text-[14px] text-muted">You're all caught up 🎉</p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto p-2">
                {items.map((n) => {
                  const type = TYPES[n.type] ?? TYPES.news;
                  const Icon = type.icon;
                  const isNew = !seen.has(n.id);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => { setOpen(false); navigate(n.link); }}
                        className="w-full flex items-start gap-3 px-3 py-3 rounded-2xl text-left hover:bg-violet-50/60 transition-colors"
                      >
                        <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", type.className)}>
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-semibold text-ink">{n.title}</span>
                          {n.body && <span className="block text-[12px] text-muted truncate">{n.body}</span>}
                          <span className="block text-[11px] text-muted mt-0.5">{timeAgo(n.at)}</span>
                        </span>
                        {isNew && <span className="mt-2 w-2 h-2 rounded-full bg-fuchsia-500 flex-shrink-0" aria-label="new" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
