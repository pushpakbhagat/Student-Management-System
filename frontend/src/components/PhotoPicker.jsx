import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Link2, Trash2 } from "lucide-react";
import Avatar from "./ui/Avatar";
import Button from "./ui/Button";
import { Input } from "./ui/Form";
import { photoToDataUrl } from "../lib/image";

// Upload a photo (resized in the browser) or paste a link. `value` is the imgURL string.
export default function PhotoPicker({ person, value, onChange, busy = false }) {
  const fileInput = useRef(null);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(() => /^https?:/.test(value ?? ""));
  const [processing, setProcessing] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setError("");
    setProcessing(true);
    try {
      onChange(await photoToDataUrl(file));
      setShowLink(false);
    } catch (err) {
      setError(err.message || "Couldn't read that image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <motion.div key={value} initial={{ scale: 0.85, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
          <Avatar person={{ ...person, imgURL: value }} size="xl" />
        </motion.div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={handleFile} tabIndex={-1} aria-hidden="true" />
          <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} loading={processing || busy}>
            {!processing && !busy && <Camera size={15} aria-hidden="true" />} {value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
              <Trash2 size={15} aria-hidden="true" /> Remove
            </Button>
          )}
          {!showLink && (
            <Button variant="ghost" size="sm" onClick={() => setShowLink(true)} disabled={busy}>
              <Link2 size={15} aria-hidden="true" /> Use a link
            </Button>
          )}
        </div>
      </div>
      {showLink && (
        <Input
          type="url"
          aria-label="Photo link"
          placeholder="https://…"
          value={/^data:/.test(value ?? "") ? "" : value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
