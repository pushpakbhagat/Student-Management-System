import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Check, UserRound, UserX } from "lucide-react";
import api, { getErrorMessage } from "../../../api";
import PhotoPicker from "../../../components/PhotoPicker";
import Button from "../../../components/ui/Button";
import { Card, CardHeader, EmptyState, PageHeader } from "../../../components/ui/Card";
import { Field, FormError, Input, Select } from "../../../components/ui/Form";
import useAdminStore from "../../../store/useAdminStore";
import { fullName, idOf } from "../../../lib/format";
import { toneFor } from "../../../lib/palette";
import { cn } from "../../../lib/cn";

const GENDERS = ["Female", "Male", "Other"];
const PROFILE_FIELDS = ["firstName", "lastName", "gender", "email", "imgURL"];

function validate(form, isEdit) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = "Required";
  if (!form.lastName.trim()) errors.lastName = "Required";
  if (!form.gender) errors.gender = "Required";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (!isEdit && !form.password) errors.password = "Required";
  if (form.password && form.password.length < 8) errors.password = "At least 8 characters";
  if (form.imgURL && !/^(https?:\/\/\S+|data:image\/)/.test(form.imgURL.trim())) errors.imgURL = "Must be an uploaded photo or a link starting with http(s)://";
  return errors;
}

// One form for both "add student" and "edit student"
export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const students = useAdminStore((s) => s.students);
  const courses = useAdminStore((s) => s.courses);
  const upsertStudent = useAdminStore((s) => s.upsertStudent);

  const original = isEdit ? students.find((s) => s._id === id) : null;
  const originalCourseIds = useMemo(
    () => new Set((original?.courses || []).map((e) => idOf(e.course))),
    [original]
  );

  const [form, setForm] = useState(() => ({
    firstName: original?.firstName ?? "",
    lastName: original?.lastName ?? "",
    gender: original?.gender ?? "",
    email: original?.email ?? "",
    imgURL: original?.imgURL ?? "",
    password: "",
  }));
  const [selected, setSelected] = useState(() => new Set(originalCourseIds));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (isEdit && !original) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Student not found"
          message="They may have been deleted."
          action={<Link to="/admin/students" className="font-semibold text-violet-600">Back to students</Link>}
        />
      </Card>
    );
  }

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toggleCourse = (courseId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });

  const removedCourses = [...originalCourseIds].filter((cid) => !selected.has(cid));
  const addedCourses = [...selected].filter((cid) => !originalCourseIds.has(cid));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = validate(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    let student = original;
    try {
      // 1. profile
      if (isEdit) {
        const changes = {};
        for (const key of PROFILE_FIELDS) {
          if (form[key].trim() !== (original[key] ?? "")) changes[key] = form[key].trim();
        }
        if (form.password) changes.password = form.password;
        if (Object.keys(changes).length) {
          ({ data: student } = await api.patch(`/students/${encodeURIComponent(original.email)}`, changes));
        }
      } else {
        const payload = Object.fromEntries(PROFILE_FIELDS.map((k) => [k, form[k].trim()]));
        ({ data: student } = await api.post("/students", { ...payload, password: form.password }));
      }
      upsertStudent(student);

      // 2. courses
      if (addedCourses.length) {
        const { data } = await api.patch("/enrollmultiplecourses", { StudentId: student._id, AppliedCourses: addedCourses });
        student = data.Student;
      }
      for (const courseId of removedCourses) {
        const { data } = await api.delete(`/courses/${courseId}/students/${student._id}`);
        student = data.Student;
      }
      upsertStudent(student);

      toast.success(isEdit ? `${fullName(student)} was updated` : `${fullName(student)} was added`);
      navigate("/admin/students");
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't save the student."));
      setSaving(false);
    }
  };

  const genderOptions = form.gender && !GENDERS.includes(form.gender) ? [...GENDERS, form.gender] : GENDERS;

  return (
    <>
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet-600 hover:text-fuchsia-600 mb-4 group">
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" /> Students
      </Link>
      <PageHeader
        eyebrow={isEdit ? "Edit student" : "New student"}
        title={isEdit ? fullName(original) : "Add a student"}
        description={isEdit ? "Change their details or the courses they take." : "They can sign in with this email and password."}
      />

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:col-span-2 overflow-hidden">
          {/* live preview strip with photo upload */}
          <div className="relative bg-linear-to-r from-violet-100 via-fuchsia-50 to-orange-50 px-5 sm:px-7 py-6">
            <p className="font-display text-[22px] font-bold text-ink truncate">{fullName(form) || "New student"}</p>
            <p className="text-[14px] text-muted truncate mb-4">{form.email || "No email yet"}</p>
            <PhotoPicker person={form} value={form.imgURL} onChange={(imgURL) => setForm((f) => ({ ...f, imgURL }))} />
            {errors.imgURL && <p className="text-[12px] font-medium text-rose-600 mt-2">{errors.imgURL}</p>}
          </div>

          <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="First name" error={errors.firstName}>
              {(p) => <Input {...p} name="firstName" value={form.firstName} onChange={update} autoComplete="off" />}
            </Field>
            <Field label="Last name" error={errors.lastName}>
              {(p) => <Input {...p} name="lastName" value={form.lastName} onChange={update} autoComplete="off" />}
            </Field>
            <Field label="Gender" error={errors.gender}>
              {(p) => (
                <Select {...p} name="gender" value={form.gender} onChange={update}>
                  <option value="">Select…</option>
                  {genderOptions.map((g) => <option key={g}>{g}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Email" error={errors.email}>
              {(p) => <Input {...p} type="email" name="email" value={form.email} onChange={update} autoComplete="off" />}
            </Field>
            <Field
              label={isEdit ? "New password" : "Password"}
              hint={isEdit ? "Leave blank to keep the current password" : "At least 8 characters"}
              error={errors.password}
            >
              {(p) => <Input {...p} type="password" name="password" value={form.password} onChange={update} autoComplete="new-password" />}
            </Field>
          </div>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader title="Courses" subtitle="Tap to enroll or remove" icon={BookOpen} />
          <div className="px-5 sm:px-6 pb-6">
            {courses.length === 0 ? (
              <p className="text-[14px] text-muted">
                No courses yet. <Link to="/admin/courses" className="font-semibold text-violet-600">Create one</Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => {
                  const on = selected.has(c._id);
                  const tone = toneFor(c._id);
                  return (
                    <motion.button
                      key={c._id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCourse(c._id)}
                      whileTap={{ scale: 0.94 }}
                      className={cn(
                        "inline-flex items-center gap-2 h-10 px-4 rounded-2xl text-[14px] font-semibold transition-all duration-200",
                        on
                          ? cn("bg-linear-to-r text-white shadow-soft", tone.gradient)
                          : "bg-surface text-ink-soft border border-line hover:border-violet-200"
                      )}
                    >
                      {on ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : <span className={cn("w-2.5 h-2.5 rounded-full bg-linear-to-br", tone.gradient)} />}
                      {c.courseName}
                    </motion.button>
                  );
                })}
              </div>
            )}
            {isEdit && removedCourses.length > 0 && (
              <p className="text-[13px] font-medium text-amber-700 bg-amber-50 rounded-2xl px-4 py-3 mt-4">
                Removing a course also deletes this student's attendance and grades for it.
              </p>
            )}
          </div>
        </Card>

        <div className="lg:col-span-3 flex flex-col gap-3">
          <FormError message={formError} />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate("/admin/students")} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>
              {!saving && <UserRound size={17} aria-hidden="true" />}
              {isEdit ? "Save changes" : "Add student"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
