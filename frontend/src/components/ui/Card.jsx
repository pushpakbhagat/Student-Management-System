import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { CountUp } from "./Motion";

export function Card({ className, children, hover = false, ...props }) {
  return (
    <div
      className={cn(
        "bg-surface rounded-3xl border border-line/80 shadow-soft",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:border-violet-200/70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
            <Icon size={17} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-ink truncate">{title}</h2>
          {subtitle && <p className="text-[12px] text-muted truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-7"
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-violet-600 font-bold mb-2">
            <span className="w-5 h-[2px] rounded-full bg-brand-gradient" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] sm:text-[34px] font-bold text-ink leading-tight">{title}</h1>
        {description && <p className="text-[14px] text-muted mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-14", className)}>
      {Icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-3xl bg-brand-gradient opacity-25 blur-xl" aria-hidden="true" />
          <div className="relative w-14 h-14 rounded-3xl bg-linear-to-br from-violet-50 to-fuchsia-50 border border-violet-100 flex items-center justify-center">
            <Icon size={24} className="text-violet-500" aria-hidden="true" />
          </div>
        </div>
      )}
      <p className="font-display text-[17px] font-semibold text-ink">{title}</p>
      {message && <p className="text-[14px] text-muted mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STAT_TONES = {
  violet: { ring: "from-violet-500 to-fuchsia-500", wash: "from-violet-100/80", icon: "text-violet-600" },
  coral: { ring: "from-orange-400 to-rose-500", wash: "from-orange-100/80", icon: "text-orange-500" },
  teal: { ring: "from-teal-400 to-emerald-500", wash: "from-teal-100/80", icon: "text-teal-600" },
  sky: { ring: "from-sky-400 to-indigo-500", wash: "from-sky-100/80", icon: "text-sky-600" },
  amber: { ring: "from-amber-400 to-orange-500", wash: "from-amber-100/80", icon: "text-amber-600" },
  good: { ring: "from-emerald-400 to-teal-500", wash: "from-emerald-100/80", icon: "text-emerald-600" },
  warn: { ring: "from-amber-400 to-orange-500", wash: "from-amber-100/80", icon: "text-amber-600" },
  bad: { ring: "from-rose-400 to-pink-500", wash: "from-rose-100/80", icon: "text-rose-600" },
};

// Big number with a coloured icon; numbers count up when first shown
export function StatCard({ label, value, suffix = "", sub, icon: Icon, tone = "violet" }) {
  const t = STAT_TONES[tone] ?? STAT_TONES.violet;
  const isNumber = typeof value === "number";
  return (
    <Card hover className="relative overflow-hidden p-5 sm:p-6 h-full">
      <div className={cn("absolute -top-12 -right-12 w-36 h-36 rounded-full bg-linear-to-br to-transparent", t.wash)} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold text-muted">{label}</p>
        {Icon && (
          <div className={cn("w-11 h-11 rounded-2xl bg-linear-to-br p-[1.5px] shadow-soft", t.ring)}>
            <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center">
              <Icon size={19} className={t.icon} aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
      <p className="relative font-display text-[34px] sm:text-[40px] font-bold text-ink leading-none mt-3 tabular-nums">
        {isNumber ? <CountUp value={value} suffix={suffix} /> : value}
      </p>
      {sub && <p className="relative text-[12px] text-muted mt-2">{sub}</p>}
    </Card>
  );
}
