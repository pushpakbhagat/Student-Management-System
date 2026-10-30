import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { CalendarDays, LogOut, Menu, Search, X } from "lucide-react";
import useSessionStore from "../../store/useSessionStore";
import { fullName } from "../../lib/format";
import { cn } from "../../lib/cn";
import { lockScroll, scrollToTop } from "../../lib/smoothScroll";
import Avatar from "../ui/Avatar";
import Logo from "../ui/Logo";
import { ErrorState } from "../ui/Feedback";
import { PageSkeleton } from "../ui/Skeleton";
import CommandPalette from "../CommandPalette";
import ThemeToggle from "../ThemeToggle";
import BackgroundDecor from "./BackgroundDecor";

const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

// Shared frame for the admin and student areas:
// floating glass sidebar on large screens, spring-animated drawer on phones/tablets.
// While `status` is "loading" the page area shows a skeleton; "error" shows a retry.
export default function AppShell({ nav, portalName, status = "ready", onRetry }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  // Ctrl/⌘ + K opens the command palette from anywhere
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // close the drawer after navigating
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    lockScroll(true);
    return () => {
      document.removeEventListener("keydown", onKey);
      lockScroll(false);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh">
      <BackgroundDecor />

      {/* Desktop: floating sidebar */}
      <aside className="hidden lg:flex fixed top-4 bottom-4 left-4 w-[264px] z-30 rounded-[28px] glass shadow-soft">
        <LayoutGroup id="desktop-nav">
          <SidebarContent nav={nav} portalName={portalName} />
        </LayoutGroup>
      </aside>

      {/* Phones & tablets: slide-in drawer */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation" data-lenis-prevent>
            <motion.div
              className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="absolute top-3 bottom-3 left-3 w-[min(19rem,calc(100vw-1.5rem))] rounded-[28px] bg-surface/95 backdrop-blur-xl border border-line shadow-lift flex"
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <button
                onClick={() => setMenuOpen(false)}
                className="absolute top-5 right-4 w-10 h-10 flex items-center justify-center rounded-2xl text-ink-soft hover:bg-violet-50"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              <LayoutGroup id="mobile-nav">
                <SidebarContent nav={nav} portalName={portalName} />
              </LayoutGroup>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paletteOpen && <CommandPalette nav={nav} onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>

      <div className="lg:pl-[288px] min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 pt-3 lg:pt-4 pb-2 bg-linear-to-b from-canvas via-canvas/90 to-transparent">
          <div className="h-14 flex items-center gap-3 px-3 sm:px-4 rounded-2xl glass shadow-soft">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-ink hover:bg-violet-50"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>
            <Logo className="lg:hidden scale-90 origin-left max-[400px]:hidden" />
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2.5 h-10 pl-3 pr-2 w-full max-w-xs rounded-xl bg-surface/70 border border-line text-[13px] text-muted hover:border-violet-200 hover:text-ink-soft transition-colors"
            >
              <Search size={16} className="text-violet-500" aria-hidden="true" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="text-[11px] font-semibold border border-line rounded-md px-1.5 py-0.5">{isMac ? "⌘" : "Ctrl"} K</kbd>
            </button>
            <div className="hidden xl:flex items-center gap-2 text-[13px] font-medium text-ink-soft ml-2 whitespace-nowrap">
              <CalendarDays size={16} className="text-violet-500" aria-hidden="true" />
              {today.format(new Date())}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setPaletteOpen(true)}
                className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center text-ink-soft hover:bg-violet-50"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <ThemeToggle />
              <UserChip className="ml-1" />
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 pt-7 sm:pt-9 pb-[max(2.5rem,env(safe-area-inset-bottom))] max-w-[1400px] mx-auto">
          {status === "error" ? (
            <ErrorState message="We couldn't load your data." onRetry={onRetry} />
          ) : status !== "ready" ? (
            <PageSkeleton />
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ nav, portalName }) {
  const user = useSessionStore((s) => s.user);
  const role = useSessionStore((s) => s.role);
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex flex-col w-full h-full p-4 overflow-y-auto" data-lenis-prevent>
      <Logo subtitle={portalName} className="px-2 pt-2 pb-7" />

      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Menu</p>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {nav.map(({ to, label, icon: Icon, tone }) => (
          <NavLink key={to} to={to} className="relative block rounded-2xl outline-offset-0">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl bg-brand-gradient shadow-glow"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 text-[14px] font-semibold transition-colors duration-200",
                    isActive ? "text-white" : "text-ink-soft hover:text-ink"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200",
                      isActive ? "bg-white/20 text-white" : tone
                    )}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <div className="relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl bg-linear-to-br from-violet-50 via-fuchsia-50 to-orange-50 border border-violet-100">
          <Avatar person={user} size="md" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">{fullName(user)}</p>
            <p className="text-[12px] font-medium text-violet-600 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <LogOut size={16} aria-hidden="true" />
          </span>
          Log out
        </button>
      </div>
    </div>
  );
}

function UserChip({ className }) {
  const user = useSessionStore((s) => s.user);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="hidden md:block text-right leading-tight max-w-44">
        <p className="text-[13px] font-semibold text-ink truncate">{fullName(user)}</p>
        <p className="text-[11px] text-muted truncate">{user?.email}</p>
      </div>
      <Avatar person={user} size="sm" />
    </div>
  );
}
