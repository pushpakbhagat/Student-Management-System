import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import BackgroundDecor from "../components/layout/BackgroundDecor";
import Logo from "../components/ui/Logo";
import useSessionStore, { homeFor } from "../store/useSessionStore";
import { buttonClass } from "../lib/buttonStyles";

export default function NotFound() {
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);
  const home = status === "authenticated" ? homeFor(role) : "/";

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-center gap-4 px-6">
      <BackgroundDecor />
      <Logo />
      <motion.p
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="font-display text-[120px] sm:text-[160px] font-extrabold leading-none text-brand-gradient mt-4"
      >
        404
      </motion.p>
      <p className="font-display text-[22px] font-bold text-ink">This page wandered off.</p>
      <p className="text-[15px] text-muted -mt-2">The link may be broken or the page may have moved.</p>
      <Link to={home} className={buttonClass({ className: "mt-3" })}>
        <ArrowLeft size={17} aria-hidden="true" /> Take me home
      </Link>
    </div>
  );
}
