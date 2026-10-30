import { create } from "zustand";
import api from "../api";

const initialState = {
  status: "idle", // "idle" | "loading" | "ready" | "error"
  profile: null,  // the student, with course names filled in
  assignments: [],
};

// Data for the student portal: always fetched fresh from the server
const usePortalStore = create((set) => ({
  ...initialState,

  load: async () => {
    set({ status: "loading" });
    try {
      const [me, assignments] = await Promise.all([api.get("/me"), api.get("/assignments")]);
      set({ status: "ready", profile: me.data.user, assignments: assignments.data.assignments });
    } catch (error) {
      set({ status: "error" });
      throw error;
    }
  },

  updateProfile: (changes) => set((state) => ({ profile: { ...state.profile, ...changes } })),

  reset: () => set(initialState),
}));

export default usePortalStore;
