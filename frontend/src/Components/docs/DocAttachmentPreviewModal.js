import { useEffect } from "react";

import DocFilePreview from "./DocFilePreview";
import { formatFileSize } from "./docFileUtils";

function DocAttachmentPreviewModal({ open, file, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !file) return null;

  return (
    <div
      className="modal-overlay doc-attachment-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal doc-attachment-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${file.fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="doc-attachment-modal-header">
          <div className="doc-attachment-modal-title">
            <h3>{file.fileName}</h3>
            {file.size ? (
              <p className="forms-muted">{formatFileSize(file.size)}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="forms-icon-btn"
            onClick={onClose}
            aria-label="Close preview"
            title="Close"
          >
            ×
          </button>
        </header>

        <div className="doc-attachment-modal-body">
          <DocFilePreview file={file} expanded hideMeta />
        </div>
      </div>
    </div>
  );
}

export default DocAttachmentPreviewModal;
