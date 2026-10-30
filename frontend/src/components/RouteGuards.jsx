import { Navigate, useLocation } from "react-router-dom";
import useSessionStore, { homeFor } from "../store/useSessionStore";
import { FullPageLoader } from "./ui/Feedback";

// Only for logged-in users with one of the given roles; everyone else is sent to the right place
export function RequireRole({ roles, children }) {
  const status = useSessionStore((s) => s.status);
  const currentRole = useSessionStore((s) => s.role);
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;
  if (status !== "authenticated") return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />;
  if (!roles.includes(currentRole)) return <Navigate to={homeFor(currentRole)} replace />;
  return children;
}

// Admin-only pages inside the staff area: teachers are sent back to the dashboard
export function AdminOnly({ children }) {
  const role = useSessionStore((s) => s.role);
  if (role !== "admin") return <Navigate to="/admin/dashboard" replace />;
  return children;
}

// Login / sign-up pages: logged-in users go to the page they originally asked for
// (if it belongs to their area) or to their dashboard
export function GuestOnly({ children }) {
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;
  if (status === "authenticated") {
    const from = location.state?.from;
    const home = homeFor(role);
    return <Navigate to={from?.startsWith(home) ? from : home} replace />;
  }
  return children;
}
