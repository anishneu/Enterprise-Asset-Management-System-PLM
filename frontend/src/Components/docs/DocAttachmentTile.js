import { formatFileSize, isImageMime } from "./docFileUtils";

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DocAttachmentTile({
  file,
  onRemove,
  onSelect,
  selected = false,
  readOnly = false,
}) {
  if (!file?.fileName) return null;

  const showThumbnail = Boolean(file.dataUrl) && isImageMime(file.mimeType);
  const isInteractive = Boolean(onSelect);

  const handleSelect = () => {
    onSelect?.(file);
  };

  const handleKeyDown = (event) => {
    if (!isInteractive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  return (
    <article
      className={`doc-attachment-tile${selected ? " is-selected" : ""}${
        isInteractive ? " is-interactive" : ""
      }`}
      onClick={isInteractive ? handleSelect : undefined}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? selected : undefined}
    >
      <div className="doc-attachment-tile-media">
        {showThumbnail ? (
          <img src={file.dataUrl} alt="" className="doc-attachment-tile-thumb" />
        ) : (
          <span className="doc-attachment-tile-icon">
            <FileIcon />
          </span>
        )}
      </div>

      <div className="doc-attachment-tile-body">
        <p className="doc-attachment-tile-name" title={file.fileName}>
          {file.fileName}
        </p>
        {file.size ? (
          <p className="doc-attachment-tile-meta">{formatFileSize(file.size)}</p>
        ) : null}
      </div>

      <div className="doc-attachment-tile-actions">
        {file.dataUrl && (
          <a
            className="doc-attachment-tile-link"
            href={file.dataUrl}
            download={file.fileName}
            onClick={(event) => event.stopPropagation()}
          >
            Download
          </a>
        )}
        {!readOnly && onRemove && (
          <button
            type="button"
            className="doc-attachment-tile-remove"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}

export default DocAttachmentTile;
