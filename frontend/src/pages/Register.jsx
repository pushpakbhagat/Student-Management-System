import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import api, { getErrorMessage } from "../api";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import { EmptyState } from "../components/ui/Card";
import { Spinner } from "../components/ui/Feedback";
import { Field, FormError, Input, Select } from "../components/ui/Form";

const EMPTY = { firstName: "", lastName: "", gender: "", email: "", password: "", confirmPassword: "" };

// First-time setup: creates the very first admin. Closed once an admin exists.
export default function Register() {
  const navigate = useNavigate();
  const [signupOpen, setSignupOpen] = useState(null); // null = still checking
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/setup-status")
      .then(({ data }) => setSignupOpen(data.adminSignupOpen))
      .catch(() => setSignupOpen(false));
  }, []);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (Object.values(form).some((value) => !value)) {
      setError("Please fill in every field.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      await api.post("/admins", payload);
      toast.success("Admin account created. You can sign in now.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't create the account."));
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
      setSubmitting(false);
    }
  };

  if (signupOpen === null) {
    return <AuthLayout><Spinner className="py-10" /></AuthLayout>;
  }

  if (!signupOpen) {
    return (
      <AuthLayout>
        <EmptyState
          icon={Lock}
          title="Admin sign-up is closed"
          message="An admin account already exists. Ask an existing admin to create an account for you."
          action={<Link to="/" className="font-semibold text-violet-600 hover:text-fuchsia-600">Back to sign in</Link>}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-[28px] font-bold text-ink leading-tight">
        Create the <span className="text-brand-gradient">admin</span> account
      </h2>
      <p className="text-[15px] text-muted mt-2 mb-7">This first account manages students, courses and assignments.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name">
            {(p) => <Input {...p} name="firstName" autoComplete="given-name" value={form.firstName} onChange={update} />}
          </Field>
          <Field label="Last name">
            {(p) => <Input {...p} name="lastName" autoComplete="family-name" value={form.lastName} onChange={update} />}
          </Field>
        </div>

        <Field label="Gender">
          {(p) => (
            <Select {...p} name="gender" value={form.gender} onChange={update}>
              <option value="">Select…</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </Select>
          )}
        </Field>

        <Field label="Email">
          {(p) => <Input {...p} type="email" name="email" autoComplete="email" value={form.email} onChange={update} />}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Password" hint="At least 8 characters">
            {(p) => <Input {...p} type="password" name="password" autoComplete="new-password" value={form.password} onChange={update} />}
          </Field>
          <Field label="Confirm password">
            {(p) => <Input {...p} type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={update} />}
          </Field>
        </div>

        <FormError message={error} />

        <Button type="submit" loading={submitting} className="h-12 mt-1">
          Create account
        </Button>
      </form>

      <p className="text-center text-[14px] text-muted mt-7">
        Already have an account?{" "}
        <Link to="/" className="font-semibold text-violet-600 hover:text-fuchsia-600">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
