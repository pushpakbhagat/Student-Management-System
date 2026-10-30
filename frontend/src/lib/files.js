import api from "../api";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_UPLOADS = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx";

// Some browsers leave file.type empty (often for Word files on Windows)
const TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// File -> { name, type, data } with data as plain base64 (what the API expects)
export function fileToUpload(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_BYTES) return reject(new Error("Files can be at most 2 MB."));
    const type = file.type || TYPE_BY_EXTENSION[file.name.split(".").pop().toLowerCase()];
    if (!type || !Object.values(TYPE_BY_EXTENSION).includes(type)) {
      return reject(new Error("Upload a PDF, image, Word document or text file."));
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type, data: String(reader.result).split(",")[1] });
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

// Download something the API serves (sends the login cookie, works on any domain setup)
export async function downloadFromApi(url, filename) {
  const { data } = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
