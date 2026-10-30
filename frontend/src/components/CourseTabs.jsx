import { motion } from "motion/react";
import { toneFor } from "../lib/palette";
import { cn } from "../lib/cn";

// Colourful course picker with a sliding highlight; scrolls sideways on small screens
export default function CourseTabs({ courses, value, onChange, id = "course-tab" }) {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 mb-5" role="tablist" aria-label="Courses" data-lenis-prevent>
      <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
        {courses.map((c) => {
          const active = value === c._id;
          const tone = toneFor(c._id);
          return (
            <button
              key={c._id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(c._id)}
              className={cn(
                "relative h-11 px-5 rounded-2xl text-[14px] font-semibold whitespace-nowrap transition-colors",
                active ? "text-white" : "bg-surface text-ink-soft border border-line hover:border-violet-200 shadow-soft"
              )}
            >
              {active && (
                <motion.span layoutId={id} className={cn("absolute inset-0 rounded-2xl bg-linear-to-r shadow-soft", tone.gradient)}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative flex items-center gap-2">
                {!active && <span className={cn("w-2.5 h-2.5 rounded-full bg-linear-to-br", tone.gradient)} />}
                {c.courseName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
