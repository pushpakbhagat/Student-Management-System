import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "motion/react";

const EASE = [0.22, 1, 0.36, 1];

// Children wrapped in <Reveal> fade and rise into place one after another
export function Stagger({ className, children, delay = 0, as = "div" }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}
    >
      {children}
    </Component>
  );
}

export function Reveal({ className, children, as = "div", ...props }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

// Fades in when scrolled into view (for content further down a page)
export function InView({ className, children, delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Number that counts up from 0 the first time it's on screen (keeps decimals, e.g. a GPA of 3.25)
export function CountUp({ value, suffix = "", duration = 1.1, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");
  const decimals = Math.min((String(value).split(".")[1] ?? "").length, 2);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [inView, value, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
