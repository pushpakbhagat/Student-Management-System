import { useState } from "react";
import { toast } from "sonner";
import { ShieldPlus, UsersRound } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import MyPhotoCard from "../../components/MyPhotoCard";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { Card, CardHeader, PageHeader } from "../../components/ui/Card";
import { Badge, Spinner } from "../../components/ui/Feedback";
import { Field, FormError, Input, Select } from "../../components/ui/Form";
import { Reveal, Stagger } from "../../components/ui/Motion";
import useSessionStore from "../../store/useSessionStore";
import { useFetch } from "../../lib/useFetch";
import { fullName } from "../../lib/format";

const EMPTY = { role: "teacher", firstName: "", lastName: "", gender: "", email: "", password: "" };

export default function Account() {
  const isAdmin = useSessionStore((s) => s.role) === "admin";
  const staff = useFetch(isAdmin ? "/staff" : null);

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings"
        description={isAdmin ? "Your account, and the people who run StudentHub with you." : "Your photo and password."} />
      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-5">
          <Reveal><MyPhotoCard /></Reveal>
          <Reveal><ChangePasswordForm /></Reveal>
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-5">
            <Reveal><AddStaffForm onCreated={staff.reload} /></Reveal>
            <Reveal><StaffList staff={staff} /></Reveal>
          </div>
        )}
      </Stagger>
    </>
  );
}

function StaffList({ staff }) {
  const list = staff.data?.staff ?? [];
  return (
    <Card>
      <CardHeader title="Staff" subtitle="Assign teachers to courses on the Courses page" icon={UsersRound} />
      {staff.loading ? <Spinner className="py-8" /> : (
        <ul className="px-3 pb-3">
          {list.map((m) => (
            <li key={m._id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
              <Avatar person={m} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink truncate">{fullName(m)}</p>
                <p className="text-[12px] text-muted truncate">
                  {m.role === "teacher" ? (m.courses.length ? m.courses.map((c) => c.courseName).join(", ") : "No courses yet") : m.email}
                </p>
              </div>
              <Badge tone={m.role === "admin" ? "indigo" : "good"}>{m.role === "admin" ? "Admin" : "Teacher"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Only logged-in admins can create staff (public sign-up closes after the first admin)
function AddStaffForm({ onCreated }) {
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
      toast.success(`${data.firstName} can now sign in as ${data.role === "teacher" ? "a teacher" : "an admin"}`);
      setForm(EMPTY);
      onCreated?.();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't create the account."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Add staff" subtitle="Teachers manage only their courses; admins manage everything" icon={ShieldPlus} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 sm:px-6 pb-6 pt-2" noValidate>
        <Field label="Role">
          {(p) => (
            <Select {...p} name="role" value={form.role} onChange={update}>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </Select>
          )}
        </Field>
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
        <Button type="submit" loading={saving} className="sm:self-start">Create {form.role}</Button>
      </form>
    </Card>
  );
}
