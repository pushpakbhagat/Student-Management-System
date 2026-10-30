import { Toaster } from "sonner";
import useThemeStore from "../store/useThemeStore";

// Toast notifications that follow the light/dark theme
export default function ThemedToaster() {
  const theme = useThemeStore((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ style: { borderRadius: "18px", fontFamily: "var(--font-sans)" } }}
    />
  );
}
