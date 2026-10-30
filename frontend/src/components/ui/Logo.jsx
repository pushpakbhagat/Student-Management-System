import { GraduationCap } from "lucide-react";
import { cn } from "../../lib/cn";

export default function Logo({ subtitle, className, light = false }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center flex-shrink-0 shadow-glow">
        <GraduationCap size={20} className="text-white" aria-hidden="true" />
      </div>
      <div className="leading-none">
        <p className={cn("font-display text-[19px] font-bold tracking-tight", light ? "text-white" : "text-ink")}>
          StudentHub
        </p>
        {subtitle && (
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] mt-1", light ? "text-white/70" : "text-muted")}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
