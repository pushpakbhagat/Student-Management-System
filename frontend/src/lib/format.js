// Small, framework-free helpers shared by pages

export const ATTENDANCE_TARGET = 75;

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ");
}

export function initials(person) {
  return `${person?.firstName?.[0] ?? ""}${person?.lastName?.[0] ?? ""}`.toUpperCase();
}

export function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// Attendance across a list of enrollments: { attended, total, pct }
export function attendanceOf(enrollments = []) {
  let attended = 0;
  let total = 0;
  for (const e of enrollments) {
    attended += e.attendedClasses || 0;
    total += e.totalClasses || 0;
  }
  return { attended, total, pct: percent(attended, total) };
}

// How many classes in a row a student must attend to reach the target percentage
export function classesNeeded(attended, total, target = ATTENDANCE_TARGET) {
  const t = target / 100;
  if (total === 0 || attended / total >= t) return 0;
  return Math.ceil((t * total - attended) / (1 - t));
}

export function attendanceTone(pct) {
  if (pct >= ATTENDANCE_TARGET) return "good";
  if (pct >= 50) return "warn";
  return "bad";
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : "";
}

export function formatShortDate(value) {
  return value ? shortDateFormat.format(new Date(value)) : "";
}

// Whole calendar days from today until the date (negative = in the past)
export function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

export function dueLabel(value) {
  const days = daysUntil(value);
  if (days === null) return "No due date";
  if (days < 0) return `Overdue by ${-days}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

// "2030-01-15T00:00:00.000Z" -> "2030-01-15" for <input type="date">
export function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

// Enrollment / assignment course fields can be an id or a populated { _id, courseName }
export function idOf(ref) {
  return ref && typeof ref === "object" ? ref._id : ref;
}
