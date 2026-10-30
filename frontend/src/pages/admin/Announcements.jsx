import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Megaphone, Pin, PinOff, Send, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../../api";
import AnnouncementCard from "../../components/AnnouncementCard";
import Button from "../../components/ui/Button";
import { Card, CardHeader, EmptyState, PageHeader } from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Spinner } from "../../components/ui/Feedback";
import { Field, FormError, Input, Select, Textarea } from "../../components/ui/Form";
import useAdminStore from "../../store/useAdminStore";
import useSessionStore from "../../store/useSessionStore";
import { useFetch } from "../../lib/useFetch";

const EMPTY = { title: "", body: "", course: "", pinned: false };

function sortAnnouncements(list) {
  return [...list].sort((a, b) => (b.pinned - a.pinned) || (new Date(b.createdAt) - new Date(a.createdAt)));
}

export default function Announcements() {
  const courses = useAdminStore((s) => s.courses);
  const isAdmin = useSessionStore((s) => s.role) === "admin";
  // teachers can only post to their own courses, so they start on the first one
  const empty = isAdmin ? EMPTY : { ...EMPTY, course: courses[0]?._id ?? "" };
  const { data, loading, setData } = useFetch("/announcements");
  const list = data?.announcements ?? [];
  const setList = (update) => setData((d) => ({ announcements: sortAnnouncements(update(d?.announcements ?? [])) }));

  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const post = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Give it a title.");
    setPosting(true);
    try {
      const { data: res } = await api.post("/announcements", { ...form, title: form.title.trim(), course: form.course || null });
      setList((l) => [res.announcement, ...l]);
      setForm(empty);
      toast.success("Announcement posted 📣");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const togglePin = async (a) => {
    try {
      const { data: res } = await api.patch(`/announcements/${a._id}`, { pinned: !a.pinned });
      setList((l) => l.map((x) => (x._id === a._id ? res.announcement : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/announcements/${pendingDelete._id}`);
      setList((l) => l.filter((x) => x._id !== pendingDelete._id));
      toast.success("Announcement deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Communication" title="Announcements" description="Post news for everyone or for one course. Students see them on their dashboard." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card className="lg:order-2 lg:sticky lg:top-24 overflow-hidden">
          <div className="h-1.5 bg-brand-gradient" aria-hidden="true" />
          <CardHeader title="New announcement" icon={Megaphone} />
          <form onSubmit={post} noValidate className="px-5 sm:px-6 pb-6 flex flex-col gap-4">
            <Field label="Title">{(p) => <Input {...p} name="title" value={form.title} onChange={update} maxLength={120} placeholder="e.g. Exams start next week" />}</Field>
            <Field label="Message (optional)">{(p) => <Textarea {...p} name="body" value={form.body} onChange={update} rows={4} maxLength={2000} />}</Field>
            <Field label="Who should see it?">
              {(p) => (
                <Select {...p} name="course" value={form.course} onChange={update}>
                  {isAdmin && <option value="">Everyone</option>}
                  {courses.map((c) => <option key={c._id} value={c._id}>Students in {c.courseName}</option>)}
                </Select>
              )}
            </Field>
            <label className="flex items-center gap-3 text-[14px] font-semibold text-ink-soft cursor-pointer">
              <input type="checkbox" name="pinned" checked={form.pinned} onChange={update} className="w-5 h-5 rounded-md accent-violet-600" />
              Pin to the top
            </label>
            <FormError message={error} />
            <Button type="submit" loading={posting}><Send size={16} aria-hidden="true" /> Post</Button>
          </form>
        </Card>

        <div className="lg:col-span-2 lg:order-1 min-w-0">
          {loading ? (
            <Spinner className="py-16" />
          ) : list.length === 0 ? (
            <Card><EmptyState icon={Megaphone} title="No announcements yet" message="Your first post will show up here and on students' dashboards." /></Card>
          ) : (
            <motion.ul layout className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {list.map((a) => (
                  <motion.li key={a._id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}>
                    <AnnouncementCard
                      announcement={a}
                      actions={(isAdmin || a.course) &&
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => togglePin(a)} aria-label={a.pinned ? "Unpin" : "Pin to top"} title={a.pinned ? "Unpin" : "Pin to top"}>
                            {a.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-rose-500 hover:bg-rose-50" onClick={() => setPendingDelete(a)} aria-label="Delete announcement">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      }
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this announcement?"
        message={pendingDelete ? `"${pendingDelete.title}" will disappear for everyone.` : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
