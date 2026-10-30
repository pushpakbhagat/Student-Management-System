import { create } from "zustand";
import { toast } from "sonner";
import api, { setUnauthorizedHandler } from "../api";
import useAdminStore from "./useAdminStore";
import usePortalStore from "./usePortalStore";

// Who is logged in. Nothing is saved in localStorage: on every page load we ask the
// server (/me), so the httpOnly cookie stays the single source of truth.
const useSessionStore = create((set, get) => ({
  status: "loading", // "loading" | "guest" | "authenticated"
  role: null,        // "admin" | "student"
  user: null,

  restore: async () => {
    try {
      const { data } = await api.get("/me");
      set({ status: "authenticated", role: data.role, user: data.user });
    } catch {
      set({ status: "guest", role: null, user: null });
    }
  },

  login: async ({ email, password, role }) => {
    const { data } = await api.post("/logininfo", { email, password, role });
    get().startSession(role, data);
    return role;
  },

  // one-click login into the shared demo accounts (only offered when the server is in demo mode)
  demoLogin: async (role) => {
    const { data } = await api.post("/demo-login", { role });
    get().startSession(role, data);
    return role;
  },

  startSession: (role, data) => {
    if (role === "admin") {
      const { admin, StudentData, courseData, assignmentData } = data.Data;
      useAdminStore.getState().hydrate({ students: StudentData, courses: courseData, assignments: assignmentData });
      set({ status: "authenticated", role, user: admin });
    } else {
      set({ status: "authenticated", role, user: data.student });
    }
  },

  // e.g. after changing your own photo
  updateUser: (changes) => set((state) => ({ user: { ...state.user, ...changes } })),

  logout: async () => {
    try {
      await api.post("/logout");
    } catch {
      // the local session is cleared below either way
    }
    get().clear();
  },

  // Session ended on the server side (expired, password changed, account removed)
  expire: () => {
    if (get().status !== "authenticated") return;
    get().clear();
    toast.error("Your session has ended. Please sign in again.");
  },

  clear: () => {
    useAdminStore.getState().reset();
    usePortalStore.getState().reset();
    set({ status: "guest", role: null, user: null });
  },
}));

setUnauthorizedHandler(() => useSessionStore.getState().expire());

export function homeFor(role) {
  return role === "admin" ? "/admin" : "/student";
}

export default useSessionStore;
