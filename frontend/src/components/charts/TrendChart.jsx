import { useId } from "react";
import { motion } from "motion/react";

const W = 600;
const H = 200;
const PAD_Y = 12;

// Area + line chart for a percentage over time (0–100). The line draws itself in.
// data: [{ label: "Oct 3", value: 92 }]
export default function TrendChart({ data, target = 75, height = 200 }) {
  const gradientId = useId();
  if (data.length < 2) {
    return <p className="text-[14px] text-muted py-10 text-center">Record a few days of attendance to see the trend.</p>;
  }

  const x = (i) => (i / (data.length - 1)) * W;
  const y = (v) => PAD_Y + (1 - v / 100) * (H - PAD_Y * 2);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div className="relative" style={{ height }}>
      {/* grid lines + labels */}
      {[100, target, 50, 0].map((v) => (
        <div key={v} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(y(v) / H) * 100}%`, transform: "translateY(-50%)" }}>
          <span className="w-8 text-right text-[10px] font-semibold text-muted tabular-nums">{v}%</span>
          <span className={`flex-1 border-t ${v === target ? "border-dashed border-amber-400/70" : "border-line"}`} />
        </div>
      ))}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 left-10 w-[calc(100%-2.5rem)] h-full overflow-visible" role="img"
        aria-label={`Attendance trend, latest ${data[data.length - 1].value}%`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="60%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill={`url(#${gradientId})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.6 }} />
        <motion.path d={line} fill="none" stroke={`url(#${gradientId}-line)`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      {/* one hover column per day: a soft highlight and a tooltip */}
      <div className="absolute inset-0 left-10 flex">
        {data.map((d, i) => (
          <div key={d.label + i} className="group relative flex-1 rounded-lg hover:bg-violet-500/[0.06] transition-colors">
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink text-surface text-[11px] font-semibold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {d.label}: {d.value}%
            </span>
          </div>
        ))}
      </div>
      <div className="absolute left-10 right-0 -bottom-6 flex justify-between text-[10px] font-semibold text-muted">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
