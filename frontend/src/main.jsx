import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      {/* honour the OS "reduce motion" setting for every animation */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionConfig>
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { borderRadius: "18px", fontFamily: "var(--font-sans)" } }}
      />
    </ErrorBoundary>
  </StrictMode>
);
