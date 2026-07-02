import { useRef } from "react";

import DocAttachmentTile from "./DocAttachmentTile";
import {
  MAX_DOC_ATTACHMENTS,
  readFileAsDataUrl,
} from "./docFileUtils";

function DocAttachmentsPanel({
  attachments = [],
  readOnly = false,
  onChange,
  onSelectAttachment,
  selectedAttachmentId,
  sidebar = false,
}) {
  const fileInputRef = useRef(null);

  const handleAdd = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (attachments.length >= MAX_DOC_ATTACHMENTS) {
      window.alert(`You can attach up to ${MAX_DOC_ATTACHMENTS} files.`);
      return;
    }

    try {
      const payload = await readFileAsDataUrl(file);
      onChange([
        ...attachments,
        {
          ...payload,
          id: `att-${Date.now()}`,
        },
      ]);
    } catch (err) {
      window.alert(err.message || "Could not attach file.");
    }
  };

  const handleRemove = (attachmentId) => {
    onChange(attachments.filter((item) => item.id !== attachmentId));
  };

  return (
    <section className={`doc-panel-card${sidebar ? " doc-panel-card--sidebar" : ""}`}>
      <div className="doc-panel-card-header">
        <h4>Attachments</h4>
        <p className="forms-muted">
          {sidebar
            ? "Attach supporting files. Click a file to preview."
            : "Add supporting files such as drawings, specifications, or reference documents."}
        </p>
      </div>

      {!readOnly && (
        <div className="doc-attachments-toolbar">
          <button
            type="button"
            className="parts-btn primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= MAX_DOC_ATTACHMENTS}
          >
            Attach file
          </button>
          <span className="forms-muted">
            {attachments.length}/{MAX_DOC_ATTACHMENTS} files · 3 MB max each
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="doc-file-input-hidden"
            onChange={handleAdd}
          />
        </div>
      )}

      {attachments.length > 0 ? (
        <div className={`doc-attachments-grid${sidebar ? " doc-attachments-grid--sidebar" : ""}`}>
          {attachments.map((attachment) => (
            <DocAttachmentTile
              key={attachment.id}
              file={attachment}
              readOnly={readOnly}
              selected={selectedAttachmentId === attachment.id}
              onSelect={onSelectAttachment}
              onRemove={() => handleRemove(attachment.id)}
            />
          ))}
        </div>
      ) : (
        <p className="forms-muted doc-file-empty">No attachments yet.</p>
      )}
    </section>
  );
}

export default DocAttachmentsPanel;
