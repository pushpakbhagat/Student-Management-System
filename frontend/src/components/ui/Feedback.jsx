import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../lib/cn";
import { STATUS, TONES } from "../../lib/palette";
import Button from "./Button";
import Logo from "./Logo";

export function Spinner({ className, label = "Loading" }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-3 text-muted text-[14px]", className)}>
      <span className="relative flex w-5 h-5" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border-2 border-violet-100" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 border-r-fuchsia-500 animate-spin" />
      </span>
      <span>{label}…</span>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6">
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <Logo />
      </motion.div>
      <Spinner />
    </div>
  );
}

export function ErrorState({ message = "We couldn't load this page.", onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
      <div className="w-14 h-14 rounded-3xl bg-rose-50 flex items-center justify-center">
        <AlertTriangle size={24} className="text-rose-500" aria-hidden="true" />
      </div>
      <p className="font-display text-[17px] font-semibold text-ink">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

const barClass = (tone) => STATUS[tone]?.bar ?? TONES[tone]?.bar ?? TONES.violet.bar;

// Animated bar; tone is good/warn/bad or a palette tone
export function ProgressBar({ value, tone = "violet", className, label }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 bg-violet-50 rounded-full overflow-hidden", className)}
    >
      <motion.div
        className={cn("h-full rounded-full", barClass(tone))}
        initial={{ width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </div>
  );
}

// Circular progress with the percentage in the middle; draws itself when shown
export function Ring({ value, size = 96, stroke = 10, color = "#7c3aed", colorTo, label, children }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const id = `ring-${color.slice(1)}-${(colorTo ?? color).slice(1)}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorTo ?? color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        {clamped > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: clamped / 100 }}
            viewport={{ once: true }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200/70",
  indigo: TONES.violet.soft,
  good: STATUS.good.soft,
  warn: STATUS.warn.soft,
  bad: STATUS.bad.soft,
};

// tone: neutral/indigo/good/warn/bad, or pass a palette object (from toneFor) as `palette`
export function Badge({ tone = "neutral", palette, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full ring-1 ring-inset text-[12px] font-semibold whitespace-nowrap",
        palette ? palette.soft : BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
