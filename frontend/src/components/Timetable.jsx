import { useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import { Card, EmptyState } from "./ui/Card";
import { Reveal, Stagger } from "./ui/Motion";
import { DAY_NAMES, SHORT_DAYS, WEEK_ORDER, classState, classesByDay, formatTime } from "../lib/timetable";
import { toneFor } from "../lib/palette";
import { cn } from "../lib/cn";

// Re-render every minute so the "Now" marker moves along
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// Week at a glance: one column per day on wide screens, stacked days on phones (today first)
export default function Timetable({ courses, emptyMessage = "No classes have been scheduled yet." }) {
  const now = useNow();
  const today = now.getDay();
  const days = useMemo(() => classesByDay(courses), [courses]);
  const total = Object.values(days).reduce((n, list) => n + list.length, 0);

  if (total === 0) {
    return <Card><EmptyState icon={CalendarClock} title="No timetable yet" message={emptyMessage} /></Card>;
  }

  // weekends only appear when something happens on them
  const shown = WEEK_ORDER.filter((d) => (d !== 0 && d !== 6) || days[d].length);
  const phoneOrder = [...shown.slice(shown.indexOf(today)), ...shown.slice(0, Math.max(0, shown.indexOf(today)))];

  return (
    <>
      {/* phones and tablets */}
      <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
        {(shown.includes(today) ? phoneOrder : shown).map((d) => (
          <Reveal key={d}>
            <DayColumn day={d} classes={days[d]} isToday={d === today} now={now} />
          </Reveal>
        ))}
      </Stagger>

      {/* desktop */}
      <div className="hidden xl:grid gap-3" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((d) => <DayColumn key={d} day={d} classes={days[d]} isToday={d === today} now={now} />)}
      </div>
    </>
  );
}

function DayColumn({ day, classes, isToday, now }) {
  return (
    <section
      aria-label={DAY_NAMES[day]}
      className={cn(
        "rounded-[28px] p-3 border h-full",
        isToday ? "bg-linear-to-b from-violet-100/80 to-fuchsia-50/40 border-violet-200" : "bg-surface/70 border-line"
      )}
    >
      <h2 className="flex items-center justify-between px-2 pt-1 pb-3">
        <span className="font-display text-[17px] font-bold text-ink">
          <span className="xl:hidden">{DAY_NAMES[day]}</span>
          <span className="hidden xl:inline">{SHORT_DAYS[day]}</span>
        </span>
        {isToday && <span className="px-2 py-0.5 rounded-full bg-brand-gradient text-white text-[11px] font-bold">Today</span>}
      </h2>
      {classes.length === 0 ? (
        <p className="px-2 pb-3 text-[13px] text-muted">No classes</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map(({ course, slot }) => {
            const tone = toneFor(course._id);
            const state = isToday ? classState(slot, now) : null;
            return (
              <li key={`${course._id}-${slot.start}`}
                className={cn("relative overflow-hidden rounded-2xl bg-surface border border-line p-3 pl-4 shadow-soft", state === "done" && "opacity-55")}>
                <span className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b", tone.gradient)} aria-hidden="true" />
                <p className="text-[12px] font-semibold text-muted tabular-nums">{formatTime(slot.start)} – {formatTime(slot.end)}</p>
                <p className="text-[15px] font-bold text-ink leading-snug break-words hyphens-auto">{course.courseName}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {slot.room && <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft"><MapPin size={12} aria-hidden="true" />{slot.room}</span>}
                  {state === "now" && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                      <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-emerald-500" /></span>
                      Now
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
