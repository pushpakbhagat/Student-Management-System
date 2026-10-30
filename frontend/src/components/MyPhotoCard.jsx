import { useState } from "react";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import api, { getErrorMessage } from "../api";
import useSessionStore from "../store/useSessionStore";
import usePortalStore from "../store/usePortalStore";
import PhotoPicker from "./PhotoPicker";
import Button from "./ui/Button";
import { Card, CardHeader } from "./ui/Card";

// Lets whoever is logged in change their own profile photo.
// Uploads and "remove" save straight away; a pasted link waits for "Save link".
export default function MyPhotoCard({ className }) {
  const user = useSessionStore((s) => s.user);
  const updateUser = useSessionStore((s) => s.updateUser);
  const updateProfile = usePortalStore((s) => s.updateProfile);
  const saved = user?.imgURL ?? "";
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);

  const save = async (imgURL) => {
    setSaving(true);
    try {
      await api.patch("/me/photo", { imgURL });
      updateUser({ imgURL });
      if (usePortalStore.getState().profile) updateProfile({ imgURL });
      setDraft(imgURL);
      toast.success(imgURL ? "Photo updated" : "Photo removed");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save your photo."));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (imgURL) => {
    setDraft(imgURL);
    if (!imgURL || imgURL.startsWith("data:")) save(imgURL);
  };

  return (
    <Card className={className}>
      <CardHeader title="Profile photo" subtitle="Shown in the sidebar and lists" icon={ImageIcon} />
      <div className="px-5 sm:px-6 pb-6 pt-1 flex flex-col gap-3">
        <PhotoPicker person={user} value={draft} onChange={handleChange} busy={saving} />
        {draft !== saved && /^https?:/.test(draft) && (
          <Button size="sm" className="self-start" onClick={() => save(draft.trim())} loading={saving}>Save link</Button>
        )}
      </div>
    </Card>
  );
}
