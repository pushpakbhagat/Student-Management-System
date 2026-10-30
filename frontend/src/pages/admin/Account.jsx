import { useState } from "react";
import { toast } from "sonner";
import { ShieldPlus } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import MyPhotoCard from "../../components/MyPhotoCard";
import Button from "../../components/ui/Button";
import { Card, CardHeader, PageHeader } from "../../components/ui/Card";
import { Field, FormError, Input, Select } from "../../components/ui/Form";
import { Reveal, Stagger } from "../../components/ui/Motion";

const EMPTY = { firstName: "", lastName: "", gender: "", email: "", password: "" };

export default function Account() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Keep your account secure and invite other admins." />
      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-5">
          <Reveal><MyPhotoCard /></Reveal>
          <Reveal><ChangePasswordForm /></Reveal>
        </div>
        <Reveal><AddAdminForm /></Reveal>
      </Stagger>
    </>
  );
}

// Only logged-in admins can create other admins (public sign-up closes after the first)
function AddAdminForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (Object.values(form).some((v) => !v.trim())) {
      setError("Please fill in every field.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/admins", form);
      toast.success(`${data.firstName} can now sign in as an admin`);
      setForm(EMPTY);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't create the admin."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Add another admin" subtitle="They get full access" icon={ShieldPlus} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 sm:px-6 pb-6 pt-2" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name">
            {(p) => <Input {...p} name="firstName" value={form.firstName} onChange={update} autoComplete="off" />}
          </Field>
          <Field label="Last name">
            {(p) => <Input {...p} name="lastName" value={form.lastName} onChange={update} autoComplete="off" />}
          </Field>
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
            {(p) => <Input {...p} type="email" name="email" value={form.email} onChange={update} autoComplete="off" />}
          </Field>
        </div>
        <Field label="Temporary password" hint="At least 8 characters — share it with them securely">
          {(p) => <Input {...p} type="password" name="password" value={form.password} onChange={update} autoComplete="new-password" />}
        </Field>
        <FormError message={error} />
        <Button type="submit" loading={saving} className="sm:self-start">Create admin</Button>
      </form>
    </Card>
  );
}
