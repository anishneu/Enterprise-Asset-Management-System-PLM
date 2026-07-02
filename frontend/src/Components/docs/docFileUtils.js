export const MAX_DOC_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_DOC_ATTACHMENTS = 8;

export function isFileFieldValue(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.fileName === "string" &&
    typeof value.dataUrl === "string"
  );
}

export function normalizeLegacyFileValue(value) {
  if (isFileFieldValue(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return {
      fileName: value.trim(),
      mimeType: "",
      dataUrl: "",
      size: 0,
      legacy: true,
    };
  }
  return null;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    if (file.size > MAX_DOC_FILE_BYTES) {
      reject(new Error("File must be 3 MB or smaller."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl: reader.result,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageMime(mimeType) {
  return String(mimeType || "").startsWith("image/");
}

export function isPdfMime(mimeType) {
  return String(mimeType || "").toLowerCase() === "application/pdf";
}

export function isTextMime(mimeType, fileName = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("text/")) return true;
  return /\.(txt|csv|json|md|log)$/i.test(fileName);
}

export function decodeTextPreview(dataUrl, maxLength = 4000) {
  if (!dataUrl || !dataUrl.includes(",")) return "";
  try {
    const base64 = dataUrl.split(",")[1];
    const text = atob(base64);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  } catch {
    return "";
  }
}
