import { motion } from "motion/react";
import { BookOpen, CalendarCheck, ClipboardList, Sparkles } from "lucide-react";
import Logo from "../ui/Logo";
import ThemeToggle from "../ThemeToggle";
import BackgroundDecor from "./BackgroundDecor";

const EASE = [0.22, 1, 0.36, 1];

// Two-column frame for the login and sign-up screens.
// Large screens: animated showcase panel + form. Phones: colourful header band + form.
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh flex lg:p-4 gap-4">
      <BackgroundDecor />
      <ThemeToggle className="fixed top-4 right-4 z-30 bg-surface/70 backdrop-blur border border-line shadow-soft max-lg:bg-white/15 max-lg:border-white/25 max-lg:text-white" />

      <Showcase />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Phone header band */}
        <div className="lg:hidden relative overflow-hidden bg-brand-gradient px-6 pt-8 pb-14 rounded-b-[36px] shadow-glow">
          <Blobs />
          <Logo light className="relative" />
          <p className="relative font-display text-[26px] font-bold text-white leading-tight mt-6 max-w-xs">
            Manage your students, beautifully.
          </p>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-10 -mt-8 lg:mt-0 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="w-full max-w-[420px] bg-surface rounded-[32px] border border-line shadow-lift p-6 sm:p-9 lg:bg-surface/80 lg:backdrop-blur-xl"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Blobs() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-fuchsia-400/50 blur-3xl animate-drift" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-orange-300/50 blur-3xl animate-drift" style={{ animationDelay: "-7s" }} />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-indigo-500/50 blur-3xl animate-drift" style={{ animationDelay: "-13s" }} />
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.35) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
    </div>
  );
}

function Showcase() {
  return (
    <div className="hidden lg:flex relative w-[52%] overflow-hidden rounded-[36px] bg-brand-gradient shadow-lift">
      <Blobs />

      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full">
        <Logo light />

        {/* Floating preview of the app */}
        <div className="relative h-[300px] xl:h-[330px] my-6" aria-hidden="true">
          <FloatingCard className="left-0 top-0 w-56 xl:w-60" delay={0.2} floatDelay="0s">
            <div className="flex items-center gap-4">
              <MiniRing />
              <div>
                <p className="text-[12px] font-semibold text-ink-soft">Attendance</p>
                <p className="font-display text-[26px] font-bold text-ink leading-none mt-1">92%</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">On track</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="right-0 top-20 w-56 xl:w-64" delay={0.35} floatDelay="-2s">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink truncate">Lab report</p>
                <p className="text-[11px] font-semibold text-orange-600">Due tomorrow</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="left-6 xl:left-16 bottom-0 w-64 xl:w-72" delay={0.5} floatDelay="-4s">
            <p className="text-[12px] font-semibold text-ink-soft mb-3">Marks this term</p>
            <div className="flex items-end gap-2 h-16">
              {[55, 78, 64, 92, 70, 85].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-lg bg-linear-to-t from-violet-500 to-fuchsia-400 origin-bottom"
                  style={{ height: `${h}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.9, delay: 0.8 + i * 0.08, ease: EASE }}
                />
              ))}
            </div>
          </FloatingCard>
        </div>

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="font-display text-[44px] xl:text-[52px] font-extrabold text-white leading-[1.04] max-w-lg"
          >
            Manage your students,{" "}
            <span className="inline-flex items-center gap-2">
              beautifully <Sparkles className="w-9 h-9 text-amber-200" aria-hidden="true" />
            </span>
          </motion.h1>
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }}
            className="mt-7 flex flex-wrap gap-2"
          >
            {[
              { icon: CalendarCheck, label: "Attendance & grades" },
              { icon: BookOpen, label: "Courses" },
              { icon: ClipboardList, label: "Assignments" },
            ].map(({ icon: Icon, label }) => (
              <motion.li
                key={label}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-[13px] font-semibold text-white ring-1 ring-white/25"
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </div>
  );
}

function FloatingCard({ className, children, delay, floatDelay }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      <div className="animate-float rounded-3xl bg-white/90 backdrop-blur-xl p-4 shadow-[0_24px_48px_-12px_rgb(40_10_80/0.45)]" style={{ animationDelay: floatDelay }}>
        {children}
      </div>
    </motion.div>
  );
}

function MiniRing() {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90 flex-shrink-0">
      <defs>
        <linearGradient id="mini-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#ecfdf5" strokeWidth="7" />
      <motion.circle
        cx="28" cy="28" r={r} fill="none" stroke="url(#mini-ring)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * 0.08 }}
        transition={{ duration: 1.4, delay: 0.6, ease: EASE }}
      />
    </svg>
  );
}
