import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, GraduationCap, UserCog } from "lucide-react";
import api, { getErrorMessage } from "../api";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import { Field, FormError, Input } from "../components/ui/Form";
import useSessionStore from "../store/useSessionStore";
import { cn } from "../lib/cn";

const ROLES = [
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "admin", label: "Admin", icon: UserCog },
];

export default function Login() {
  const login = useSessionStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  // The "create admin" link only makes sense before the first admin exists
  useEffect(() => {
    api.get("/setup-status")
      .then(({ data }) => setSignupOpen(data.adminSignupOpen))
      .catch(() => setSignupOpen(false));
  }, []);

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <fieldset>
          <legend className="text-[13px] font-semibold text-ink-soft mb-2">I am a</legend>
          <div className="relative grid grid-cols-2 p-1.5 rounded-2xl bg-violet-50/80 border border-violet-100">
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
                    className="absolute inset-0 rounded-xl bg-white shadow-soft"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold transition-colors",
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

      {signupOpen && (
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
