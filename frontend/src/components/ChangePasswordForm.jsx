import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import api, { getErrorMessage } from "../api";
import Button from "./ui/Button";
import { Card, CardHeader } from "./ui/Card";
import { Field, FormError, Input } from "./ui/Form";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

// 0–4 based on length and variety, for the strength meter
function strength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
const STRENGTH = [
  { label: "Too short", color: "bg-rose-400" },
  { label: "Weak", color: "bg-orange-400" },
  { label: "Okay", color: "bg-amber-400" },
  { label: "Good", color: "bg-teal-400" },
  { label: "Strong", color: "bg-emerald-500" },
];

export default function ChangePasswordForm({ className }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const score = strength(form.newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.currentPassword || !form.newPassword) {
      setError("Fill in your current and new password.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/me/password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(EMPTY);
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't change your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader title="Change password" subtitle="Other devices will be signed out" icon={KeyRound} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 sm:px-6 pb-6 pt-2" noValidate>
        <Field label="Current password">
          {(p) => <Input {...p} type="password" name="currentPassword" autoComplete="current-password" value={form.currentPassword} onChange={update} />}
        </Field>
        <Field label="New password">
          {(p) => <Input {...p} type="password" name="newPassword" autoComplete="new-password" value={form.newPassword} onChange={update} />}
        </Field>
        {form.newPassword && (
          <div aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < score ? STRENGTH[score].color : "bg-violet-50"}`} />
              ))}
            </div>
            <p className="text-[12px] font-semibold text-muted mt-1.5">{STRENGTH[score].label}</p>
          </div>
        )}
        <Field label="Confirm new password">
          {(p) => <Input {...p} type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={update} />}
        </Field>
        <FormError message={error} />
        <Button type="submit" loading={saving} className="sm:self-start">Update password</Button>
      </form>
    </Card>
  );
}
