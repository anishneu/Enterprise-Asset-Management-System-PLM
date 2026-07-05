import { useEffect, useState } from "react";

import apiClient from "../../api/client";
import { formatDocDisplayName } from "../docs/docFormUtils";
import WorkflowStatusBadge from "./WorkflowStatusBadge";

function CurriculumDocPreviewModal({ docId, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(Boolean(docId));

  useEffect(() => {
    if (!docId) {
      setDoc(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`/docs/${docId}`)
      .then((res) => {
        if (!cancelled) setDoc(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setDoc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (!docId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal training-plm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="training-modal-header">
          <h3>Document details</h3>
          <button type="button" className="training-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <div className="training-modal-body">
          {loading && <p className="training-plm-empty">Loading document…</p>}
          {!loading && !doc && <p className="training-plm-empty">Document not found.</p>}
          {!loading && doc && (
            <dl className="training-record-detail">
              <div>
                <dt>Name</dt>
                <dd>{formatDocDisplayName(doc)}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{doc.dtype || "—"}</dd>
              </div>
              <div>
                <dt>Revision</dt>
                <dd>{doc.drev || "—"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <WorkflowStatusBadge status={doc.dstatus} />
                </dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{doc.ddesc?.trim() || "—"}</dd>
              </div>
              {doc.dlink && (
                <div>
                  <dt>Link</dt>
                  <dd>
                    <a href={doc.dlink} target="_blank" rel="noreferrer">
                      Open document
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

export default CurriculumDocPreviewModal;
