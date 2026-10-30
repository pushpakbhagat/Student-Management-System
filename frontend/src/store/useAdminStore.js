import { create } from "zustand";
import api from "../api";
import { idOf } from "../lib/format";

const initialState = {
  status: "idle", // "idle" | "loading" | "ready" | "error"
  students: [],
  courses: [],
  assignments: [],
};

// Everything the admin screens show. Loaded once per session, then kept in sync
// with the responses of each change the admin makes.
const useAdminStore = create((set, get) => ({
  ...initialState,

  hydrate: ({ students, courses, assignments }) =>
    set({ status: "ready", students, courses, assignments }),

  load: async () => {
    set({ status: "loading" });
    try {
      const [students, courses, assignments] = await Promise.all([
        api.get("/students"),
        api.get("/courses"),
        api.get("/assignments"),
      ]);
      get().hydrate({
        students: students.data,
        courses: courses.data.Courses,
        assignments: assignments.data.assignments,
      });
    } catch (error) {
      set({ status: "error" });
      throw error;
    }
  },

  reset: () => set(initialState),

  // ── students ──
  upsertStudent: (student) =>
    set((state) => {
      const exists = state.students.some((s) => s._id === student._id);
      return {
        students: exists
          ? state.students.map((s) => (s._id === student._id ? student : s))
          : [student, ...state.students],
      };
    }),

  upsertStudents: (list) => list.forEach((student) => get().upsertStudent(student)),

  removeStudent: (id) =>
    set((state) => ({ students: state.students.filter((s) => s._id !== id) })),

  // ── courses ──
  addCourse: (course) =>
    set((state) => ({
      courses: [...state.courses, course].sort((a, b) => a.courseName.localeCompare(b.courseName)),
    })),

  updateCourse: (course) =>
    set((state) => ({ courses: state.courses.map((c) => (c._id === course._id ? course : c)) })),

  // The server also un-enrolls students and deletes the course's assignments
  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((c) => c._id !== id),
      assignments: state.assignments.filter((a) => idOf(a.course) !== id),
      students: state.students.map((s) => ({
        ...s,
        courses: (s.courses || []).filter((e) => idOf(e.course) !== id),
      })),
    })),

  // ── assignments ──
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [...state.assignments, assignment] })),

  removeAssignment: (id) =>
    set((state) => ({ assignments: state.assignments.filter((a) => a._id !== id) })),
}));

export default useAdminStore;
