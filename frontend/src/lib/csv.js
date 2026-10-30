// Builds a CSV file in the browser and downloads it (opens fine in Excel / Google Sheets)
function escape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  // quote anything with commas, quotes or line breaks; neutralise spreadsheet formulas
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  // BOM so Excel reads UTF-8 names correctly
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
