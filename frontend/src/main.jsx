import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import ErrorBoundary from "./components/ErrorBoundary";
import ThemedToaster from "./components/ThemedToaster";
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
      <ThemedToaster />
    </ErrorBoundary>
  </StrictMode>
);
