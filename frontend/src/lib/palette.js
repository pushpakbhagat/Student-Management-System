// Every course (and every person's avatar) gets a stable colour from this palette, so the
// same course looks the same on every screen. Class names are written out in full so
// Tailwind can find them.
export const TONES = {
  violet: {
    gradient: "from-violet-500 to-fuchsia-500",
    soft: "bg-violet-50 text-violet-700 ring-violet-200/70",
    chip: "bg-violet-100 text-violet-600",
    bar: "bg-linear-to-r from-violet-500 to-fuchsia-500",
    text: "text-violet-600",
    hex: "#7c3aed",
  },
  coral: {
    gradient: "from-orange-400 to-rose-500",
    soft: "bg-orange-50 text-orange-700 ring-orange-200/70",
    chip: "bg-orange-100 text-orange-600",
    bar: "bg-linear-to-r from-orange-400 to-rose-500",
    text: "text-orange-600",
    hex: "#f97316",
  },
  teal: {
    gradient: "from-teal-400 to-emerald-500",
    soft: "bg-teal-50 text-teal-700 ring-teal-200/70",
    chip: "bg-teal-100 text-teal-600",
    bar: "bg-linear-to-r from-teal-400 to-emerald-500",
    text: "text-teal-600",
    hex: "#14b8a6",
  },
  sky: {
    gradient: "from-sky-400 to-indigo-500",
    soft: "bg-sky-50 text-sky-700 ring-sky-200/70",
    chip: "bg-sky-100 text-sky-600",
    bar: "bg-linear-to-r from-sky-400 to-indigo-500",
    text: "text-sky-600",
    hex: "#0ea5e9",
  },
  amber: {
    gradient: "from-amber-400 to-orange-500",
    soft: "bg-amber-50 text-amber-700 ring-amber-200/70",
    chip: "bg-amber-100 text-amber-600",
    bar: "bg-linear-to-r from-amber-400 to-orange-500",
    text: "text-amber-600",
    hex: "#f59e0b",
  },
  pink: {
    gradient: "from-pink-400 to-fuchsia-500",
    soft: "bg-pink-50 text-pink-700 ring-pink-200/70",
    chip: "bg-pink-100 text-pink-600",
    bar: "bg-linear-to-r from-pink-400 to-fuchsia-500",
    text: "text-pink-600",
    hex: "#ec4899",
  },
};

const ORDER = ["violet", "coral", "teal", "sky", "amber", "pink"];

// Same input → same colour, every time
export function toneFor(key = "") {
  let hash = 0;
  for (const ch of String(key)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const name = ORDER[hash % ORDER.length];
  return { name, ...TONES[name] };
}

// Attendance health → colour
export const STATUS = {
  good: { soft: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", bar: "bg-linear-to-r from-emerald-400 to-teal-500", hex: "#10b981" },
  warn: { soft: "bg-amber-50 text-amber-700 ring-amber-200/70", bar: "bg-linear-to-r from-amber-400 to-orange-500", hex: "#f59e0b" },
  bad: { soft: "bg-rose-50 text-rose-700 ring-rose-200/70", bar: "bg-linear-to-r from-rose-400 to-pink-500", hex: "#f43f5e" },
  neutral: { soft: "bg-slate-100 text-slate-600 ring-slate-200/70", bar: "bg-slate-300", hex: "#94a3b8" },
};
