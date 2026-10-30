// Weekly timetable helpers. Slots are { day: 0-6 (Sunday first, like Date#getDay), start: "HH:MM", end: "HH:MM", room }

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Week shown Monday first
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// "13:30" -> "1:30 PM"
export function formatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function minutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// [{ course, slot }] for every class in the week, sorted by start time
export function classesByDay(courses) {
  const days = Object.fromEntries(WEEK_ORDER.map((d) => [d, []]));
  for (const course of courses) {
    for (const slot of course.schedule ?? []) days[slot.day]?.push({ course, slot });
  }
  for (const list of Object.values(days)) list.sort((a, b) => a.slot.start.localeCompare(b.slot.start));
  return days;
}

// "now" | "next" | "done" for a class today, relative to `now`
export function classState(slot, now = new Date()) {
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= minutes(slot.end)) return "done";
  if (current >= minutes(slot.start)) return "now";
  return "next";
}

export function blankSlot() {
  return { day: 1, start: "09:00", end: "10:00", room: "" };
}
