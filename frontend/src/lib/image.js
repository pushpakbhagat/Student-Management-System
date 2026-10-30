// Turns a picked photo into a small square image (data URL) so it can be stored in the
// database without a separate file service. 320px WebP is usually 10–30 KB.
const SIZE = 320;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export async function photoToDataUrl(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is too large (max 15 MB).");

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  // centre crop to a square
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();

  const webp = canvas.toDataURL("image/webp", 0.85);
  // older Safari can't encode WebP and silently returns PNG; use JPEG there instead
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}
