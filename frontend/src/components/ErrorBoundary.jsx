import { Component } from "react";
import Button from "./ui/Button";
import Logo from "./ui/Logo";

// Catches crashes in any page so the user sees a way out instead of a blank screen
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unexpected error", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center gap-4 px-6">
        <Logo />
        <h1 className="text-[26px] font-bold text-ink mt-6">Something went wrong</h1>
        <p className="text-[15px] text-muted max-w-sm">An unexpected error happened. Reloading the page usually fixes it.</p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
