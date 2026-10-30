import { cn } from "./cn";

const VARIANTS = {
  primary:
    "bg-brand-gradient text-white border-transparent shadow-glow hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-white text-ink-soft border-line shadow-soft hover:border-violet-200 hover:text-violet-700 hover:-translate-y-0.5 active:translate-y-0",
  danger: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:border-rose-200",
  dangerSolid: "bg-linear-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-[0_10px_24px_-8px_rgb(244_63_94/0.6)] hover:brightness-110",
  ghost: "bg-transparent text-ink-soft border-transparent hover:bg-violet-50 hover:text-violet-700",
};

const SIZES = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[14px] gap-2 rounded-2xl",
  icon: "h-11 w-11 rounded-2xl justify-center",
};

// Shared by <Button> and by links that should look like buttons
export function buttonClass({ variant = "primary", size = "md", className } = {}) {
  return cn(
    "inline-flex items-center justify-center border font-semibold whitespace-nowrap select-none",
    "transition-all duration-200 ease-out",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}
