import { AnimatePresence, motion } from "motion/react";
import { MonitorDown } from "lucide-react";
import { useInstallPrompt } from "../lib/pwa";

// Shows up in the top bar only when the browser says the app can be installed
export default function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  return (
    <AnimatePresence>
      {canInstall && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
          onClick={install}
          className="h-11 px-3 sm:px-4 rounded-2xl bg-surface border border-line shadow-soft text-[13px] font-semibold text-ink-soft hover:text-violet-700 hover:border-violet-200 inline-flex items-center gap-2"
          aria-label="Install StudentHub as an app"
        >
          <MonitorDown size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Install app</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
