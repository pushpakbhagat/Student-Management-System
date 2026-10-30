import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, GraduationCap, Presentation, UserCog } from "lucide-react";
import api, { getErrorMessage } from "../api";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import { Field, FormError, Input } from "../components/ui/Form";
import useSessionStore from "../store/useSessionStore";
import { cn } from "../lib/cn";

const ROLES = [
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "teacher", label: "Teacher", icon: Presentation },
  { value: "admin", label: "Admin", icon: UserCog },
];

export default function Login() {
  const login = useSessionStore((s) => s.login);
  const demoLogin = useSessionStore((s) => s.demoLogin);
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [setup, setSetup] = useState({ adminSignupOpen: false, demo: false });

  // The "create admin" link only makes sense before the first admin exists;
  // demo buttons only when the server runs in demo mode
  useEffect(() => {
    api.get("/setup-status")
      .then(({ data }) => setSetup(data))
      .catch(() => {});
  }, []);

  const tryDemo = async (role) => {
    setError("");
    setDemoLoading(role);
    try {
      await demoLogin(role);
    } catch (err) {
      setError(getErrorMessage(err, "The demo isn't available right now."));
      setDemoLoading(null);
    }
  };

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form); // GuestOnly redirects once the session is set
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't sign you in."));
      setForm((f) => ({ ...f, password: "" }));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-[30px] font-bold text-ink leading-tight">
        Welcome <span className="text-brand-gradient">back</span> 👋
      </h2>
      <p className="text-[15px] text-muted mt-2 mb-8">Sign in to your account to continue.</p>

      {setup.demo && (
        <div className="mb-7">
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(({ value, label, icon: Icon }) => (
              <Button key={value} variant="secondary" onClick={() => tryDemo(value)} loading={demoLoading === value}
                disabled={Boolean(demoLoading)} className="h-auto py-2.5 flex-col gap-1 px-2">
                {demoLoading !== value && <Icon size={18} className="text-violet-500" aria-hidden="true" />}
                <span className="text-[12px] leading-tight">Try as<br />{label.toLowerCase()}</span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-6 text-[12px] font-semibold uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-line" /> or sign in <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <fieldset>
          <legend className="text-[13px] font-semibold text-ink-soft mb-2">I am a</legend>
          <div className="relative grid grid-cols-3 p-1.5 rounded-2xl bg-violet-50/80 border border-violet-100">
            {ROLES.map(({ value, label, icon: Icon }) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={form.role === value}
                  onChange={update}
                  className="peer sr-only"
                />
                {form.role === value && (
                  <motion.span
                    layoutId="role-pill"
                    className="absolute inset-0 rounded-xl bg-surface shadow-soft"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex items-center justify-center gap-1.5 h-11 rounded-xl text-[13px] sm:text-[14px] font-semibold transition-colors",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-violet-500",
                    form.role === value ? "text-violet-700" : "text-muted hover:text-ink-soft"
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Email">
          {(props) => (
            <Input {...props} type="email" name="email" autoComplete="email" inputMode="email"
              value={form.email} onChange={update} placeholder="you@example.com" required />
          )}
        </Field>

        <Field label="Password">
          {(props) => (
            <Input {...props} type="password" name="password" autoComplete="current-password"
              value={form.password} onChange={update} placeholder="••••••••" required />
          )}
        </Field>

        <FormError message={error} />

        <Button type="submit" loading={submitting} disabled={!form.email || !form.password} className="h-12 mt-1 group">
          {submitting ? "Signing in…" : "Sign in"}
          {!submitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />}
        </Button>
      </form>

      {setup.adminSignupOpen && (
        <p className="text-center text-[14px] text-muted mt-7">
          Setting up for the first time?{" "}
          <Link to="/register" className="font-semibold text-violet-600 hover:text-fuchsia-600 transition-colors">
            Create the admin account
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
