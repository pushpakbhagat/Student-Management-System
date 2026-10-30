import { motion } from "motion/react";

// Big gradient banner at the top of the dashboards
export default function Hero({ eyebrow, title, children, actions, illustration }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[32px] bg-brand-gradient text-white shadow-glow mb-6"
    >
      {/* decoration */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/15 blur-2xl animate-drift" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-orange-300/30 blur-3xl animate-drift" style={{ animationDelay: "-9s" }} />
        <div className="absolute top-8 right-1/3 w-24 h-24 rounded-[28px] border-2 border-white/20 rotate-12 animate-float" />
        <div className="absolute bottom-10 right-16 w-14 h-14 rounded-full border-2 border-white/25 animate-float" style={{ animationDelay: "-3s" }} />
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.4) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
      </div>

      <div className="relative flex flex-col md:flex-row md:items-center gap-6 p-6 sm:p-9">
        <div className="flex-1 min-w-0">
          {eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/75 mb-2">{eyebrow}</p>}
          <h1 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.05]">{title}</h1>
          {children && <div className="text-[15px] text-white/85 mt-3 max-w-xl leading-relaxed">{children}</div>}
          {actions && <div className="flex flex-wrap gap-2.5 mt-6">{actions}</div>}
        </div>
        {illustration && <div className="hidden md:block flex-shrink-0">{illustration}</div>}
      </div>
    </motion.section>
  );
}
