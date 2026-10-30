import { create } from "zustand";

// "light" | "dark" | "system". Saved per browser; index.html applies it before the first paint.
const KEY = "studenthub-theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

function readPreference() {
  try {
    const saved = localStorage.getItem(KEY);
    return ["light", "dark", "system"].includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

function resolve(preference) {
  return preference === "system" ? (media.matches ? "dark" : "light") : preference;
}

function apply(preference) {
  document.documentElement.dataset.theme = resolve(preference);
}

const useThemeStore = create((set, get) => ({
  preference: readPreference(),
  theme: resolve(readPreference()), // what is actually shown

  setPreference: (preference) => {
    try {
      localStorage.setItem(KEY, preference);
    } catch {
      // private mode etc. - still works for this visit
    }
    apply(preference);
    set({ preference, theme: resolve(preference) });
  },

  // light → dark → system → light …
  cycle: () => {
    const order = ["light", "dark", "system"];
    const next = order[(order.indexOf(get().preference) + 1) % order.length];
    get().setPreference(next);
  },
}));

// follow the OS when the preference is "system"
media.addEventListener("change", () => {
  const { preference } = useThemeStore.getState();
  if (preference !== "system") return;
  apply(preference);
  useThemeStore.setState({ theme: resolve(preference) });
});

export default useThemeStore;
