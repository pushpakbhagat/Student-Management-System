import { useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/cn";

const CONTROL =
  "w-full bg-white border border-line text-ink text-[15px] sm:text-[14px] placeholder:text-muted/70 " +
  "rounded-2xl px-4 py-3 outline-none shadow-[inset_0_1px_2px_rgb(29_22_56/0.04)] transition-all duration-200 " +
  "hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 " +
  "aria-[invalid=true]:border-rose-300 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-rose-500/10 disabled:opacity-60";

// Label + control + hint/error, wired up for screen readers.
// Usage: <Field label="Email">{(props) => <Input {...props} />}</Field>
export function Field({ label, hint, error, className, children }) {
  const id = useId();
  const describedBy = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-soft">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {(error || hint) && (
        <p id={describedBy} className={cn("text-[12px]", error ? "text-rose-600 font-medium" : "text-muted")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(CONTROL, "resize-y min-h-24", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(CONTROL, "appearance-none pr-10 bg-no-repeat bg-[right_0.9rem_center] cursor-pointer", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237c3aed' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormError({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 text-[13px] font-medium rounded-2xl px-4 py-3">
            <AlertCircle size={16} className="flex-shrink-0" aria-hidden="true" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
