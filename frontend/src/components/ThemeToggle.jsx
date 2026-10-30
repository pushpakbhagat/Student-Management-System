import { AnimatePresence, motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import useThemeStore from "../store/useThemeStore";
import { cn } from "../lib/cn";

const ICONS = { light: Sun, dark: Moon, system: Monitor };
const LABELS = { light: "Light theme", dark: "Dark theme", system: "Theme follows your device" };

// One button that cycles light → dark → system
export default function ThemeToggle({ className }) {
  const preference = useThemeStore((s) => s.preference);
  const cycle = useThemeStore((s) => s.cycle);
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${LABELS[preference]} (click to change)`}
      aria-label={`${LABELS[preference]}. Click to change.`}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center text-ink-soft hover:bg-violet-50 hover:text-violet-600 transition-colors overflow-hidden",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={preference}
          initial={{ y: -16, opacity: 0, rotate: -60 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 16, opacity: 0, rotate: 60 }}
          transition={{ duration: 0.2 }}
        >
          <Icon size={18} aria-hidden="true" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
