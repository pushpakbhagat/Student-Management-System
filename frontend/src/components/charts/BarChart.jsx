import { motion } from "motion/react";
import { cn } from "../../lib/cn";

// Vertical bars that grow in. data: [{ label, value, className (bar colour), hint }]
export default function BarChart({ data, height = 180 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex items-end gap-3 sm:gap-4" style={{ height }} role="img"
      aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex-1 h-full flex flex-col items-center justify-end gap-2">
          <span className="text-[13px] font-bold text-ink tabular-nums">{d.value}</span>
          <div className="relative w-full flex-1 flex items-end">
            <motion.div
              className={cn("w-full rounded-xl origin-bottom", d.className)}
              style={{ height: `${Math.max((d.value / max) * 100, d.value ? 4 : 1.5)}%` }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            />
            {d.hint && (
              <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink text-surface text-[11px] font-semibold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {d.hint} · {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            )}
          </div>
          <span className="text-[13px] font-bold text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
