import {
  decodeTextPreview,
  formatFileSize,
  isImageMime,
  isPdfMime,
  isTextMime,
} from "./docFileUtils";

function DocFilePreview({
  file,
  compact = false,
  expanded = false,
  hideMeta = false,
  hideDownload = false,
}) {
  if (!file?.fileName) return null;

  const hasContent = Boolean(file.dataUrl);
  const mimeType = file.mimeType || "";
  const showImage = hasContent && isImageMime(mimeType);
  const showPdf = hasContent && isPdfMime(mimeType);
  const showText = hasContent && isTextMime(mimeType, file.fileName);
  const textPreview = showText ? decodeTextPreview(file.dataUrl) : "";

  return (
    <div
      className={`doc-file-preview${
        compact ? " doc-file-preview--compact" : ""
      }${expanded ? " doc-file-preview--expanded" : ""}`}
    >
      {!hideMeta && (
        <div className="doc-file-preview-meta">
          <strong>{file.fileName}</strong>
          {file.size ? (
            <span className="doc-file-preview-size">{formatFileSize(file.size)}</span>
          ) : null}
          {file.legacy && !hasContent && (
            <span className="doc-file-preview-legacy">
              Filename only — re-upload to view contents
            </span>
          )}
        </div>
      )}

      {showImage && (
        <img
          src={file.dataUrl}
          alt={file.fileName}
          className="doc-file-preview-image"
        />
      )}

      {showPdf && (
        <iframe
          title={file.fileName}
          src={file.dataUrl}
          className="doc-file-preview-frame"
        />
      )}

      {showText && textPreview && (
        <pre className="doc-file-preview-text">{textPreview}</pre>
      )}

      {hasContent && !hideDownload && (
        <a
          className="doc-file-download-link"
          href={file.dataUrl}
          download={file.fileName}
        >
          Download {file.fileName}
        </a>
      )}
    </div>
  );
}

export default DocFilePreview;
