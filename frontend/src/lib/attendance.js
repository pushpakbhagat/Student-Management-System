// Attendance statuses, in the order shown, with their colours
export const STATUS_OPTIONS = [
  { value: "present", label: "Present", short: "P", tone: "good", dot: "bg-emerald-500", on: "bg-linear-to-r from-emerald-400 to-teal-500 text-white shadow-[0_8px_20px_-6px_rgb(16_185_129/0.55)]" },
  { value: "late", label: "Late", short: "L", tone: "warn", dot: "bg-amber-500", on: "bg-linear-to-r from-amber-400 to-orange-500 text-white shadow-[0_8px_20px_-6px_rgb(245_158_11/0.55)]" },
  { value: "absent", label: "Absent", short: "A", tone: "bad", dot: "bg-rose-500", on: "bg-linear-to-r from-rose-400 to-pink-500 text-white shadow-[0_8px_20px_-6px_rgb(244_63_94/0.55)]" },
  { value: "excused", label: "Excused", short: "E", tone: "neutral", dot: "bg-slate-400", on: "bg-slate-500 text-white" },
];

export const STATUS_BY_VALUE = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o]));
