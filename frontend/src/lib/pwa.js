import { useSyncExternalStore } from "react";

// Register the service worker in production builds only (in dev it would cache Vite's live files)
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // the app works fine without it, it just can't be installed or opened offline
    });
  });
}

// Chrome/Edge/Android fire `beforeinstallprompt` once the app can be installed.
// Keep the event so an "Install app" button can show the browser's prompt later.
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, () => Boolean(deferredPrompt), () => false);
  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
  };
  return { canInstall, install };
}
