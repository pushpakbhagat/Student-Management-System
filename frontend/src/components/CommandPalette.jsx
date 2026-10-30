import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, CalendarCheck, ClipboardList, CornerDownLeft, LogOut, Palette, Search, UserPlus } from "lucide-react";
import Avatar from "./ui/Avatar";
import useSessionStore from "../store/useSessionStore";
import useAdminStore from "../store/useAdminStore";
import usePortalStore from "../store/usePortalStore";
import useThemeStore from "../store/useThemeStore";
import { lockScroll } from "../lib/smoothScroll";
import { fullName, idOf } from "../lib/format";
import { toneFor } from "../lib/palette";
import { cn } from "../lib/cn";

const PER_GROUP = 6;

function matches(item, q) {
  return !q || `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(q);
}

// Ctrl/⌘ + K: jump to any page, student, course or assignment, or run a quick action
export default function CommandPalette({ nav, onClose }) {
  const navigate = useNavigate();
  const role = useSessionStore((s) => s.role);
  const logout = useSessionStore((s) => s.logout);
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const adminAssignments = useAdminStore((s) => s.assignments);
  const portalAssignments = usePortalStore((s) => s.assignments);
  const profile = usePortalStore((s) => s.profile);
  const cycleTheme = useThemeStore((s) => s.cycle);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, []);

  const items = useMemo(() => {
    const go = (to) => () => navigate(to);
    const isAdmin = role === "admin";
    const all = [
      ...nav.map((n) => ({ id: `page-${n.to}`, group: "Pages", label: n.label, icon: n.icon, run: go(n.to) })),
      ...(isAdmin
        ? [
            { id: "a-add", group: "Actions", label: "Add a student", icon: UserPlus, run: go("/admin/students/new") },
            { id: "a-att", group: "Actions", label: "Take attendance", icon: CalendarCheck, run: go("/admin/attendance") },
            { id: "a-asg", group: "Actions", label: "Create an assignment", icon: ClipboardList, run: go("/admin/assignments") },
          ]
        : []),
      { id: "a-theme", group: "Actions", label: "Switch theme", hint: "light / dark / system", icon: Palette, run: cycleTheme, keepOpen: true },
      {
        id: "a-logout", group: "Actions", label: "Log out", icon: LogOut,
        run: async () => { await logout(); navigate("/", { replace: true }); },
      },
      ...(isAdmin
        ? students.map((s) => ({ id: `s-${s._id}`, group: "Students", label: fullName(s), hint: s.email, person: s, run: go(`/admin/students/${s._id}/edit`) }))
        : []),
      ...(isAdmin
        ? courses.map((c) => ({ id: `c-${c._id}`, group: "Courses", label: c.courseName, icon: BookOpen, tone: toneFor(c._id), run: go("/admin/courses") }))
        : (profile?.courses || []).map((e) => ({ id: `c-${idOf(e.course)}`, group: "Courses", label: e.course?.courseName ?? "Course", icon: BookOpen, tone: toneFor(idOf(e.course)), run: go("/student/attendance") }))),
      ...(isAdmin ? adminAssignments : portalAssignments).map((a) => ({
        id: `as-${a._id}`, group: "Assignments", label: a.title, icon: ClipboardList, tone: toneFor(idOf(a.course)),
        run: go(isAdmin ? "/admin/assignments" : "/student/assignments"),
      })),
    ];
    return all;
  }, [role, nav, students, courses, adminAssignments, portalAssignments, profile, navigate, logout, cycleTheme]);

  const q = query.trim().toLowerCase();
  const groups = [];
  for (const item of items.filter((i) => matches(i, q))) {
    let group = groups.find((g) => g.name === item.group);
    if (!group) groups.push((group = { name: item.group, items: [] }));
    if (group.items.length < PER_GROUP) group.items.push(item);
  }
  const flat = groups.flatMap((g) => g.items);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const runItem = async (item) => {
    if (!item) return;
    await item.run();
    if (!item.keepOpen) onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); runItem(flat[activeIndex]); }
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  let index = -1;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search" data-lenis-prevent>
      <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="relative w-full max-w-xl rounded-[28px] bg-surface border border-line shadow-lift overflow-hidden"
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center gap-3 px-5 border-b border-line">
          <Search size={19} className="text-violet-500 flex-shrink-0" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder={role === "admin" ? "Search students, courses, pages…" : "Search courses, assignments, pages…"}
            className="flex-1 h-14 bg-transparent outline-none text-[16px] text-ink placeholder:text-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={flat[activeIndex] ? `palette-${flat[activeIndex].id}` : undefined}
          />
          <kbd className="hidden sm:inline text-[11px] font-semibold text-muted border border-line rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>

        <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {flat.length === 0 && <li className="px-4 py-10 text-center text-[14px] text-muted">No results for "{query}"</li>}
          {groups.map((group) => (
            <li key={group.name} role="presentation">
              <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{group.name}</p>
              <ul role="presentation">
                {group.items.map((item) => {
                  index += 1;
                  const i = index;
                  const isActive = i === activeIndex;
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.id}
                      id={`palette-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => runItem(item)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors",
                        isActive ? "bg-violet-50 text-violet-700" : "text-ink-soft"
                      )}
                    >
                      {item.person ? (
                        <Avatar person={item.person} size="sm" />
                      ) : (
                        <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", item.tone ? item.tone.chip : "bg-violet-100 text-violet-600")}>
                          {Icon && <Icon size={16} aria-hidden="true" />}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold truncate">{item.label}</span>
                        {item.hint && <span className="block text-[12px] text-muted truncate">{item.hint}</span>}
                      </span>
                      {isActive && <CornerDownLeft size={15} className="text-violet-400 flex-shrink-0" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
